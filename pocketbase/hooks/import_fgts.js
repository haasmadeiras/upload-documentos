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
                  'Você é um assistente especializado em extrair dados de guias FGTS (SEFIP/GRF/eSocial). Seu objetivo é localizar e extrair APENAS a lista de funcionários/trabalhadores REAIS com seus respectivos CPFs. Ignore cabeçalhos de relatório, nomes de empresas, totalizadores, datas e textos irrelevantes. Retorne um objeto JSON estrito com a chave "employees", contendo um array de objetos, onde cada objeto tem "name" (string, nome completo do trabalhador) e "tax_id" (string, CPF formatado como XXX.XXX.XXX-XX). IMPORTANTE: Extraia apenas os dados presentes no texto, garantindo que o nome do funcionário esteja completo. Não extraia dados parciais ou nomes de empresas.',
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
            for (const emp of parsed.employees) {
              if (!emp.name || !emp.tax_id || emp.name.trim().length < 5) {
                $app
                  .logger()
                  .error(
                    'Validation Error: Missing or invalid field in extracted employee row',
                    'data',
                    JSON.stringify(emp),
                  )
              } else {
                // Ensure name is properly formatted
                const cleanName = emp.name.replace(/\s+/g, ' ').trim()
                const lowerName = cleanName.toLowerCase()
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
                ]
                const isGhost = invalidKeywords.some((kw) => lowerName.includes(kw))

                if (!isGhost) {
                  employees.push({ name: cleanName, tax_id: emp.tax_id })
                } else {
                  $app
                    .logger()
                    .error(
                      'Validation Error: Filtered ghost employee from header',
                      'data',
                      JSON.stringify(emp),
                    )
                }
              }
            }
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
      const lines = text.split('\n')
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim()
        const cpfMatch = line.match(/(\d{3}\.\d{3}\.\d{3}\-\d{2})/)

        if (cpfMatch) {
          const cpf = cpfMatch[1]
          let name = ''

          let potentialName = line.replace(cpf, '').replace(/[0-9]/g, '').trim()

          if (potentialName.length > 5) {
            name = potentialName
          } else if (i > 0) {
            const prevLine = lines[i - 1].replace(/[0-9]/g, '').trim()
            if (prevLine.length > 5) {
              name = prevLine
            }
          }

          if (name) {
            name = name.replace(/\s+/g, ' ').trim()
            const lowerName = name.toLowerCase()
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
              'caixa',
              'econômica',
              'federal',
            ]

            const isGhost = invalidKeywords.some((kw) => lowerName.includes(kw))
            if (!isGhost && name.includes(' ')) {
              employees.push({ name, tax_id: cpf })
            } else if (isGhost) {
              $app
                .logger()
                .error(
                  'Validation Error: Filtered ghost employee from regex fallback',
                  'name',
                  name,
                  'cpf',
                  cpf,
                )
            } else {
              $app
                .logger()
                .error(
                  'Validation Error: Incomplete name from regex fallback',
                  'name',
                  name,
                  'cpf',
                  cpf,
                )
            }
          } else {
            $app
              .logger()
              .error('Validation Error: Could not find name for CPF in regex fallback', 'cpf', cpf)
          }
        }
      }
    }

    if (employees.length === 0) {
      throw new BadRequestError(
        'Não foi possível identificar funcionários neste documento de forma confiável. Verifique se a guia contém CPFs legíveis e nomes completos.',
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
          if (record.getString('name') !== empData.name) {
            record.set('name', empData.name)
            $app.save(record)
          }
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

    // Link employees to the uploaded document to maintain relationship integrity
    if (body.documentId && savedEmployeeIds.length > 0) {
      try {
        const doc = $app.findRecordById('documents', body.documentId)
        try {
          // Attempt to link all employees (works if field is multi-select)
          doc.set('employee', savedEmployeeIds)
          $app.save(doc)
        } catch (_) {
          // Fallback to linking the first employee (works if field is single-select)
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
