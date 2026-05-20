routerAdd(
  'POST',
  '/backend/v1/employees/import-fgts',
  (e) => {
    const user = e.auth
    if (!user) {
      throw new UnauthorizedError('Unauthorized')
    }

    const body = e.requestInfo().body
    if (!body || !body.text) {
      throw new BadRequestError('Conteúdo do arquivo não enviado ou texto não extraído.')
    }

    const text = body.text

    if (!text || text.trim().length === 0) {
      throw new BadRequestError('Nenhum texto pôde ser extraído do documento PDF.')
    }

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
      throw new BadRequestError(
        'Não foi possível identificar funcionários neste documento de forma confiável. Verifique se a guia contém CPFs legíveis e nomes completos.',
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
    employees = uniqueEmps

    if (employees.length === 0) {
      throw new BadRequestError('Foram encontrados registros, mas nenhum com CPF válido.')
    }

    const empCollection = $app.findCollectionByNameOrId('employees')
    let count = 0
    const savedEmployeeIds = []

    for (const empData of employees) {
      try {
        let record = null
        try {
          record = $app.findFirstRecordByFilter(
            'employees',
            'tax_id = {:tax_id} && user = {:user}',
            {
              tax_id: empData.tax_id,
              user: user.id,
            },
          )
        } catch (_) {}

        if (record) {
          savedEmployeeIds.push(record.id)
        } else {
          record = new Record(empCollection)
          record.set('name', empData.name)
          record.set('tax_id', empData.tax_id)
          record.set('role', 'outros')
          record.set('user', user.id)
          $app.save(record)
          savedEmployeeIds.push(record.id)
          count++
        }
      } catch (err) {
        $app.logger().error('Failed to save employee', 'cpf', empData.tax_id, 'error', err.message)
      }
    }

    if (body.documentId && savedEmployeeIds.length > 0) {
      try {
        const doc = $app.findRecordById('documents', body.documentId)
        try {
          doc.set('employee', savedEmployeeIds)
          $app.save(doc)
        } catch (_) {
          doc.set('employee', savedEmployeeIds[0])
          $app.save(doc)
        }
      } catch (err) {
        $app
          .logger()
          .error(
            'Failed to link extracted employees to document',
            'documentId',
            body.documentId,
            'error',
            err.message,
          )
      }
    }

    return e.json(200, { message: 'Success', count, employeeIds: savedEmployeeIds })
  },
  $apis.requireAuth(),
)
