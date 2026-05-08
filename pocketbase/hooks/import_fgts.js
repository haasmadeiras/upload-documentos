routerAdd(
  'POST',
  '/backend/v1/employees/import-fgts',
  async (e) => {
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

    let employees = []

    // Utiliza o AI Gateway para extração precisa e robusta dos dados do FGTS
    const aiUrl = $secrets.get('SKIP_AI_GATEWAY_URL')
    const aiKey = $secrets.get('SKIP_AI_GATEWAY_API_KEY')

    if (aiUrl && aiKey) {
      try {
        let apiUrl = aiUrl
        if (!apiUrl.endsWith('/v1/chat/completions')) {
          apiUrl = apiUrl.replace(/\/$/, '') + '/v1/chat/completions'
        }
        const aiRes = $http.send({
          url: apiUrl,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${aiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content:
                  'Você é um assistente especializado em extrair dados de guias FGTS (SEFIP/GRF/eSocial). Seu objetivo é localizar e extrair APENAS a lista de funcionários/trabalhadores com seus respectivos CPFs. Retorne um objeto JSON estrito com a chave "employees", contendo um array de objetos, onde cada objeto tem "name" (string, nome completo do trabalhador) e "tax_id" (string, CPF formatado como XXX.XXX.XXX-XX). Ignore dados da empresa ou totalizadores. IMPORTANTE: Extraia apenas os dados presentes no texto, não gere ou invente nomes.',
              },
              {
                role: 'user',
                content: text.substring(0, 80000),
              },
            ],
            response_format: { type: 'json_object' },
          }),
          timeout: 60,
        })

        if (aiRes.statusCode >= 200 && aiRes.statusCode < 300) {
          const content = aiRes.json.choices[0].message.content
          const parsed = JSON.parse(content)
          if (parsed && Array.isArray(parsed.employees)) {
            employees = parsed.employees.filter((emp) => emp.name && emp.tax_id)
          }
        } else {
          $app
            .logger()
            .error(
              'AI Gateway response error',
              'status',
              aiRes.statusCode,
              'body',
              String(aiRes.body),
            )
        }
      } catch (err) {
        $app.logger().error('AI Gateway request failed', 'error', err.message)
      }
    }

    // Fallback: Regex extraction if AI fails
    if (employees.length === 0) {
      const regex =
        /([A-ZÀ-Ÿa-zà-ÿ][A-ZÀ-Ÿa-zà-ÿ\s]{4,60})[\s\S]{0,100}?(\d{3}\.\d{3}\.\d{3}\-\d{2})/g
      let match
      while ((match = regex.exec(text)) !== null) {
        let name = match[1].replace(/\n/g, ' ').trim()
        name = name.replace(/\s+/g, ' ')
        const cpf = match[2]

        if (
          name.length > 5 &&
          !name.toLowerCase().includes('total') &&
          !name.toLowerCase().includes('empresa')
        ) {
          employees.push({ name, tax_id: cpf })
        }
      }
    }

    if (employees.length === 0) {
      throw new BadRequestError(
        'Não foi possível identificar funcionários neste documento. Verifique se a guia contém CPFs válidos e legíveis.',
      )
    }

    // Deduplicate extracted records by CPF
    const uniqueEmps = []
    const seenCpfs = new Set()
    for (const emp of employees) {
      if (!seenCpfs.has(emp.tax_id)) {
        seenCpfs.add(emp.tax_id)
        uniqueEmps.push(emp)
      }
    }
    employees = uniqueEmps

    const empCollection = $app.findCollectionByNameOrId('employees')
    let count = 0

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
          if (record.getString('name') !== empData.name) {
            record.set('name', empData.name)
            $app.save(record)
          }
        } else {
          record = new Record(empCollection)
          record.set('name', empData.name)
          record.set('tax_id', empData.tax_id)
          record.set('role', 'outros')
          record.set('user', user.id)
          $app.save(record)
          count++
        }
      } catch (err) {
        $app.logger().error('Failed to save employee', 'cpf', empData.tax_id, 'error', err.message)
      }
    }

    return e.json(200, { message: 'Success', count })
  },
  $apis.requireAuth(),
)
