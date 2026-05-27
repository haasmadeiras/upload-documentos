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
      if (!cpf) return false
      cpf = String(cpf).replace(/\D/g, '')
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

    if (action === 'extract') {
      let text = body.text
      if (!text || text.trim().length === 0) {
        throw e.badRequestError('O arquivo PDF parece estar vazio ou não contém texto extraível.')
      }

      // Clean special characters and invisible whitespace
      text = text.replace(/[\x00-\x09\x0B-\x1F\x7F-\x9F\u200B-\u200D\uFEFF\u00A0]/g, ' ')

      const OPENAI_KEY = $secrets.get('OPENAI_API_KEY')
      if (!OPENAI_KEY) {
        throw e.internalServerError('A chave da API da OpenAI não está configurada no servidor.')
      }

      const aiReq = $http.send({
        url: 'https://api.openai.com/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + OPENAI_KEY,
        },
        body: JSON.stringify({
          model: 'gpt-5.4-mini',
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                "Você é um assistente de extração de dados especializado. O usuário fornecerá o texto bruto de uma guia de FGTS ou folha de pagamento. Extraia todos os funcionários listados na seção 'Relação de Trabalhadores'. Retorne um objeto JSON contendo a chave 'employees' com uma lista de objetos. Cada objeto deve ter os campos: 'name' (nome completo do trabalhador, string), 'tax_id' (CPF do trabalhador, string contendo exatamente 11 números, sem pontuação), e 'role' (cargo do trabalhador, string que deve ser 'motorista', 'operador' ou 'outros'). Se o cargo não for especificado de forma clara no documento, utilize o valor 'outros'. Nunca inclua o nome da empresa emissora como um funcionário.",
            },
            {
              role: 'user',
              content: text.substring(0, 30000),
            },
          ],
          temperature: 0.1,
        }),
        timeout: 90,
      })

      if (aiReq.statusCode !== 200) {
        $app
          .logger()
          .error(
            'Erro na integração com OpenAI',
            'status',
            aiReq.statusCode,
            'body',
            aiReq.json || aiReq.body,
          )
        throw e.internalServerError('A extração via IA falhou devido a um erro no provedor.')
      }

      let aiEmployees = []
      try {
        const aiData = aiReq.json
        const contentStr = aiData.choices[0].message.content
        const parsed = JSON.parse(contentStr)
        if (parsed && Array.isArray(parsed.employees)) {
          aiEmployees = parsed.employees
        } else {
          throw new Error('Estrutura JSON inválida recebida da IA')
        }
      } catch (err) {
        $app.logger().error('Falha ao processar resposta JSON da IA', 'error', err.message)
        throw e.internalServerError('A IA retornou uma estrutura de dados inválida ou vazia.')
      }

      const uniqueEmps = []
      const seenCpfs = new Set()

      for (const emp of aiEmployees) {
        const rawCpf = String(emp.tax_id || '').replace(/\D/g, '')
        let role = String(emp.role || '').toLowerCase()
        if (!['motorista', 'operador', 'outros'].includes(role)) {
          role = 'outros'
        }

        if (isValidCPF(rawCpf) && !seenCpfs.has(rawCpf)) {
          seenCpfs.add(rawCpf)
          uniqueEmps.push({
            name: String(emp.name || '').trim(),
            tax_id: rawCpf,
            role: role,
          })
        }
      }

      if (uniqueEmps.length === 0) {
        throw e.badRequestError(
          'Não foi possível extrair dados válidos de funcionários com CPF neste documento.',
        )
      }

      return e.json(200, { employees: uniqueEmps })
    }

    if (action === 'save') {
      const employeesToSave = body.employees || []
      if (employeesToSave.length === 0) {
        throw e.badRequestError('Nenhum funcionário válido foi encontrado para salvar.')
      }

      let count = 0
      const savedEmployeeIds = []

      try {
        $app.runInTransaction((txApp) => {
          const empCollection = txApp.findCollectionByNameOrId('employees')

          const existingRecords = txApp.findRecordsByFilter(
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

            if (existingCpfs.has(rawCpf)) {
              savedEmployeeIds.push(cpfToId[rawCpf])
            } else {
              const record = new Record(empCollection)
              record.set('name', String(empData.name || '').trim())
              record.set('tax_id', rawCpf)

              let role = String(empData.role || '').toLowerCase()
              if (!['motorista', 'operador', 'outros'].includes(role)) {
                role = 'outros'
              }
              record.set('role', role)

              record.set('user', user.id)
              txApp.save(record)

              savedEmployeeIds.push(record.id)
              existingCpfs.add(rawCpf)
              cpfToId[rawCpf] = record.id
              count++
            }
          }
        })
      } catch (err) {
        $app
          .logger()
          .error('Transaction failed while saving extracted employees', 'error', err.message)
        throw e.internalServerError(
          'Ocorreu um erro interno ao salvar os funcionários. Tente novamente.',
        )
      }

      return e.json(200, { message: 'Success', count, employeeIds: savedEmployeeIds })
    }

    throw e.badRequestError('Ação inválida solicitada ao servidor.')
  },
  $apis.requireAuth(),
  $apis.bodyLimit(50 * 1024 * 1024),
)
