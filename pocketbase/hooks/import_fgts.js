routerAdd(
  'POST',
  '/backend/v1/employees/import-fgts',
  (e) => {
    const user = e.auth
    if (!user) {
      throw e.unauthorizedError('Unauthorized')
    }

    const body = e.requestInfo().body || {}
    if (!body) {
      throw e.badRequestError('Nenhum dado enviado.')
    }

    const action = body.action || 'extract_and_save'

    const isValidCPF = (cpf) => {
      cpf = cpf.replace(/\D/g, '')
      if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false
      let sum = 0,
        rest
      for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i)
      rest = (sum * 10) % 11
      if (rest === 10 || rest === 11) rest = 0
      if (rest !== parseInt(cpf.substring(9, 10))) return false
      sum = 0
      for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i)
      rest = (sum * 10) % 11
      if (rest === 10 || rest === 11) rest = 0
      if (rest !== parseInt(cpf.substring(10, 11))) return false
      return true
    }

    if (action === 'extract' || action === 'extract_and_save') {
      let text = body.text
      if (!text || text.trim().length === 0) {
        throw e.badRequestError('Nenhum texto pôde ser extraído do documento PDF.')
      }

      // Clean special characters and invisible whitespace to prevent processing issues
      text = text.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F\u200B-\u200D\uFEFF\u00A0]/g, ' ')

      let employees = []
      const cpfPattern = /\d{3}\.?\d{3}\.?\d{3}\-?\d{2}/g
      let match
      const foundCpfs = []

      while ((match = cpfPattern.exec(text)) !== null) {
        const start = match.index
        const end = start + match[0].length

        const charBefore = start > 0 ? text[start - 1] : ''
        const charAfter = end < text.length ? text[end] : ''

        if (/[0-9]/.test(charBefore) || /[0-9]/.test(charAfter)) {
          continue
        }

        const rawCpf = match[0].replace(/\D/g, '')
        if (isValidCPF(rawCpf)) {
          foundCpfs.push({ cpf: rawCpf, index: start })
        }
      }

      for (const item of foundCpfs) {
        const textBefore = text.substring(Math.max(0, item.index - 250), item.index)
        const tokens = textBefore.trim().split(/\s+/)

        let nameTokens = []
        for (let i = tokens.length - 1; i >= 0; i--) {
          const token = tokens[i]

          if (/^[\d\/\.\-]+$/.test(token)) {
            if (nameTokens.length === 0) continue
            break
          }

          if (/[A-Za-zÀ-ÿ]/.test(token)) {
            const lower = token.toLowerCase()
            if (
              [
                'empresa',
                'total',
                'ltda',
                'cnpj',
                'competência',
                'página',
                'fgts',
                'guia',
                'recolhimento',
                'banco',
                'trabalhador',
                'nome',
                'pis',
                'pasep',
                'ci',
                'admissão',
                'categoria',
                'vínculos',
                'múltiplos',
                'dep',
              ].includes(lower)
            ) {
              if (nameTokens.length > 0) break
              continue
            }
            nameTokens.unshift(token)
          } else {
            if (nameTokens.length > 0) break
          }
        }

        let name = nameTokens
          .join(' ')
          .replace(/[^A-Za-zÀ-ÿ\s\.\'\-]/g, '')
          .trim()

        const invalidKeywords = [
          'empresa',
          'total',
          'ltda',
          's/a',
          's.a',
          'cnpj',
          'competência',
          'página',
          'fgts',
          'guia',
          'recolhimento',
          'data',
          'valor',
          'banco',
          'gerado',
          'sistema',
        ]

        const isGhost = invalidKeywords.some((kw) => name.toLowerCase().includes(kw))
        if (!isGhost && name.includes(' ') && name.length > 4) {
          employees.push({ name, tax_id: item.cpf })
        }
      }

      if (employees.length === 0) {
        throw e.badRequestError(
          'Não foi possível identificar funcionários neste documento. Verifique a formatação do PDF.',
        )
      }

      const uniqueEmps = []
      const seenCpfs = new Set()
      for (const emp of employees) {
        const rawCpf = emp.tax_id.replace(/\D/g, '')
        if (!seenCpfs.has(rawCpf) && isValidCPF(rawCpf)) {
          seenCpfs.add(rawCpf)
          uniqueEmps.push({ ...emp, tax_id: rawCpf })
        }
      }

      if (uniqueEmps.length === 0) {
        throw e.badRequestError(
          'Não foi possível identificar funcionários neste documento. Verifique a formatação do PDF.',
        )
      }

      if (action === 'extract') {
        return e.json(200, { employees: uniqueEmps })
      }

      body.employees = uniqueEmps
    }

    if (action === 'save' || action === 'extract_and_save') {
      const employeesToSave = body.employees || []
      if (employeesToSave.length === 0) {
        throw e.badRequestError('Nenhum funcionário para salvar.')
      }

      const empCollection = $app.findCollectionByNameOrId('employees')
      let count = 0
      const savedEmployeeIds = []

      // Fetch existing employees for this user to avoid N+1 queries timeout
      const existingRecords = $app.findRecordsByFilter(
        'employees',
        "user = '" + user.id + "'",
        '',
        10000,
        0,
      )
      const existingCpfs = new Set()
      const cpfToId = {}
      for (const rec of existingRecords) {
        const c = rec.getString('tax_id')
        existingCpfs.add(c)
        cpfToId[c] = rec.id
      }

      for (const empData of employeesToSave) {
        const rawCpf = String(empData.tax_id || '').replace(/\D/g, '')
        if (!isValidCPF(rawCpf)) continue

        try {
          if (existingCpfs.has(rawCpf)) {
            savedEmployeeIds.push(cpfToId[rawCpf])
          } else {
            const record = new Record(empCollection)
            record.set('name', String(empData.name || '').trim())
            record.set('tax_id', rawCpf)
            record.set('role', 'outros')
            record.set('user', user.id)
            $app.save(record)
            savedEmployeeIds.push(record.id)
            existingCpfs.add(rawCpf)
            cpfToId[rawCpf] = record.id
            count++
          }
        } catch (err) {
          $app.logger().error('Failed to save employee', 'cpf', rawCpf, 'error', err.message)
        }
      }

      return e.json(200, { message: 'Success', count, employeeIds: savedEmployeeIds })
    }

    throw e.badRequestError('Invalid action')
  },
  $apis.requireAuth(),
  $apis.bodyLimit(50 * 1024 * 1024),
)
