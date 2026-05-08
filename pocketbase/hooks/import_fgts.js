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

    // Targeted Row Detection based on standard layout:
    // [MM/YYYY] [DD/MM/YYYY] [NOME DO TRABALHADOR] [MATRÍCULA (10+ digits)] [CPF]
    const strictRegex =
      /\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+([A-Za-zÀ-ÿ\s\.\'\-]+?)\s+\d{10,}\s+(\d{3}\.\d{3}\.\d{3}\-\d{2})/g

    let matches = [...text.matchAll(strictRegex)]

    if (matches.length > 0) {
      for (const match of matches) {
        let name = match[1].replace(/\s+/g, ' ').trim()
        const cpf = match[2].replace(/\D/g, '')

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
        ]

        const isGhost = invalidKeywords.some((kw) => lowerName.includes(kw))
        if (!isGhost && name.includes(' ') && name.length > 5) {
          employees.push({ name, tax_id: cpf })
        }
      }
    } else {
      // Fallback: search for CPF and take preceding words
      const fallbackRegex =
        /(?:^|\s)([A-ZÀ-Ÿ][A-Za-zÀ-ÿ\s\.\'\-]{4,60}?)\s+(?:\d{10,}\s+)?(\d{3}\.\d{3}\.\d{3}\-\d{2})/g
      matches = [...text.matchAll(fallbackRegex)]
      for (const match of matches) {
        let name = match[1].replace(/\s+/g, ' ').trim()
        const cpf = match[2].replace(/\D/g, '')

        // Strip any leading dates that might have been caught
        name = name.replace(/^\d{2}\/\d{4}\s+\d{2}\/\d{2}\/\d{4}\s+/, '').trim()

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
        ]

        const isGhost = invalidKeywords.some((kw) => lowerName.includes(kw))
        if (!isGhost && name.includes(' ') && name.length > 5) {
          employees.push({ name, tax_id: cpf })
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
