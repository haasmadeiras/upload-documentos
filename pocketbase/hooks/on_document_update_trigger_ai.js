onRecordAfterUpdateSuccess((e) => {
  if (e.record.getString('status') !== 'Pending') return e.next()

  const fileChanged = e.record.getString('file') !== e.record.original().getString('file')
  const statusChanged = e.record.getString('status') !== e.record.original().getString('status')

  if (!fileChanged && !statusChanged) return e.next()

  try {
    const docId = e.record.id
    const userId = e.record.getString('user')

    let expectedTaxId = ''
    let expectedName = ''

    try {
      if (e.record.getString('supplier')) {
        const supplier = $app.findRecordById('suppliers', e.record.getString('supplier'))
        expectedTaxId = supplier.getString('tax_id')
        expectedName = supplier.getString('legal_name') || supplier.getString('name')
      } else if (e.record.getString('employee')) {
        const emp = $app.findRecordById('employees', e.record.getString('employee'))
        expectedTaxId = emp.getString('tax_id')
        expectedName = emp.getString('name')
      } else {
        const userRecord = $app.findRecordById('users', userId)
        expectedTaxId = userRecord.getString('tax_id')
        expectedName = userRecord.getString('legal_name') || userRecord.getString('name')
      }
    } catch (err) {
      console.log('Error fetching context:', err.message)
    }

    let defName = 'Documento'
    let defInstructions = ''
    try {
      if (e.record.getString('definition')) {
        const def = $app.findRecordById('document_definitions', e.record.getString('definition'))
        defName = def.getString('name')
        defInstructions = def.getString('ai_validation_instructions') || ''
      }
    } catch (err) {}

    const promptMessage = `Por favor, analise o documento recém-enviado.
ID do Registro do Documento: ${docId}
Tipo de Documento Esperado: ${defName}
Instruções Específicas de Validação: ${defInstructions ? defInstructions : 'Nenhuma instrução específica.'}
CNPJ/CPF Esperado: ${expectedTaxId}
Nome/Razão Social Esperado: ${expectedName}
Data Atual: ${new Date().toISOString().split('T')[0]}

Instruções:
1. Use a ferramenta 'documents' para ler o registro do documento fornecido e analisar o arquivo anexado (use capacidades de visão).
2. Verifique se o documento corresponde ao 'Tipo de Documento Esperado'.
3. Extraia o CNPJ/CPF do documento. REMOVA todas as pontuações (pontos, traços, barras) do CNPJ/CPF extraído e do 'CNPJ/CPF Esperado'. Compare apenas os dígitos numéricos. Especificamente para Certidão Negativa de Débitos (CND Estadual, etc), se a raiz (primeiros 8 dígitos numéricos) coincidir, considere válido.
4. Extraia o Nome/Razão Social e verifique se corresponde ao esperado usando fuzzy matching (tolere pequenas diferenças e abreviações).
5. Siga rigorosamente as 'Instruções Específicas de Validação' se houver.
6. Extraia a data de validade (expiration_date) presente no documento no formato YYYY-MM-DD. Procure especificamente por termos como "válida até", "validade:", "vencimento em". Seja extremamente preciso. Se o documento contiver datas no formato brasileiro (ex: 17/05/2026 ou 17/5/2026), converta corretamente para YYYY-MM-DD (ex: 2026-05-17). Não invente datas como o último dia do ano se não estiver explícito.
7. Se a data de validade extraída for anterior à 'Data Atual', classifique obrigatoriamente o status como 'Vencido' e defina is_expired como true.
8. Se os dados de CNPJ/CPF numéricos ou Nome não corresponderem, classifique como 'Rejected' com os devidos detalhes em explanation e forneça o motivo específico e claro em português no campo rejection_reason.

RETORNE APENAS um JSON estrito. Não adicione texto antes ou depois do JSON. Não envolva com crases (markdown).`

    let analysisResult = null
    let rawContent = ''
    let attempts = 0
    let lastError = null

    while (attempts < 2 && !analysisResult) {
      attempts++
      try {
        const result = $ai.agent('document-analyst').chat({
          user_id: userId,
          message:
            attempts === 1
              ? promptMessage
              : `A resposta anterior não foi um JSON válido. Por favor, retorne APENAS um JSON estrito. Erro: ${lastError.message}`,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'document_analysis',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  status: {
                    type: 'string',
                    enum: ['Approved', 'Rejected', 'Aguardando Aprovação', 'Vencido'],
                  },
                  rejection_reason: {
                    type: 'string',
                    description: 'Motivo detalhado da rejeição se o status não for Approved.',
                  },
                  explanation: { type: 'string' },
                  extracted_expiration_date: { type: 'string' },
                  is_expired: { type: 'boolean' },
                  extracted_tax_id: { type: 'string' },
                  extracted_name: { type: 'string' },
                  match_confidence: {
                    type: 'string',
                    enum: ['High', 'Medium', 'Low'],
                  },
                },
                required: [
                  'status',
                  'rejection_reason',
                  'explanation',
                  'extracted_expiration_date',
                  'is_expired',
                  'extracted_tax_id',
                  'extracted_name',
                  'match_confidence',
                ],
                additionalProperties: false,
              },
            },
          },
        })

        rawContent = result.content
        let jsonStr = rawContent.trim()

        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }

        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          jsonStr = jsonMatch[0]
        }

        analysisResult = JSON.parse(jsonStr)

        if (
          !['Approved', 'Rejected', 'Aguardando Aprovação', 'Vencido'].includes(
            analysisResult.status,
          )
        ) {
          analysisResult.status = 'Aguardando Aprovação'
        }
      } catch (err) {
        lastError = err
        console.log(`Tentativa ${attempts} falhou ao parsear JSON:`, err.message, rawContent)
      }
    }

    if (!analysisResult) {
      analysisResult = {
        status: 'Aguardando Aprovação',
        rejection_reason: 'Falha ao processar resposta da IA. Documento será revisado manualmente.',
        explanation: 'Falha ao processar resposta da IA. Documento será revisado manualmente.',
        extracted_expiration_date: '',
        is_expired: false,
        extracted_tax_id: '',
        extracted_name: '',
        match_confidence: 'Low',
      }
    }

    const docRecord = $app.findRecordById('documents', docId)
    docRecord.set('analysis_log', analysisResult)

    if (analysisResult.status === 'Approved') {
      docRecord.set('status', 'Approved')
      docRecord.set('rejection_reason', '')
    } else if (analysisResult.status === 'Rejected') {
      docRecord.set('status', 'Rejected')
      docRecord.set(
        'rejection_reason',
        analysisResult.rejection_reason || analysisResult.explanation || 'Documento inválido.',
      )
    } else if (analysisResult.status === 'Vencido' || analysisResult.is_expired) {
      docRecord.set('status', 'Vencido')
      docRecord.set(
        'rejection_reason',
        analysisResult.rejection_reason || analysisResult.explanation || 'Documento vencido.',
      )
    } else {
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set(
        'rejection_reason',
        analysisResult.rejection_reason ||
          analysisResult.explanation ||
          'Necessita de revisão humana.',
      )
    }

    if (
      analysisResult.extracted_expiration_date &&
      analysisResult.extracted_expiration_date !== 'null' &&
      analysisResult.extracted_expiration_date.includes('-')
    ) {
      try {
        const expDate = Date.parse(analysisResult.extracted_expiration_date)
        if (!isNaN(expDate)) {
          docRecord.set(
            'expiration_date',
            analysisResult.extracted_expiration_date + ' 12:00:00.000Z',
          )

          if (expDate < Date.now()) {
            docRecord.set('status', 'Vencido')
            docRecord.set(
              'rejection_reason',
              'O documento está vencido de acordo com a data extraída.',
            )
          }
        }
      } catch (e) {}
    }

    $app.save(docRecord)
  } catch (err) {
    console.log('Failed to trigger AI analyst:', err.message)
    try {
      const docRecord = $app.findRecordById('documents', e.record.id)
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set(
        'rejection_reason',
        'Erro interno na análise automática. Será analisado manualmente.',
      )
      docRecord.set('analysis_log', { error: err.message })
      $app.save(docRecord)
    } catch (saveErr) {}
  }

  return e.next()
}, 'documents')
