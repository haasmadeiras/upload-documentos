onRecordAfterUpdateSuccess(async (e) => {
  const originalStatus = e.record.original().getString('status')
  const newStatus = e.record.getString('status')

  if (newStatus !== 'Pending') return e.next()
  if (originalStatus === 'Pending') return e.next()

  try {
    const docId = e.record.id
    const userId = e.record.getString('user')

    let contextText = ''

    try {
      if (e.record.getString('supplier')) {
        const supplier = $app.findRecordById('suppliers', e.record.getString('supplier'))
        const taxId = supplier.getString('tax_id')
        const name = supplier.getString('legal_name') || supplier.getString('name')
        contextText = `Entidade do Documento: Fornecedor (PJ/PF)\nCNPJ/CPF Esperado: ${taxId}\nNome/Razão Social Esperada: ${name}`
      } else if (e.record.getString('employee')) {
        const emp = $app.findRecordById('employees', e.record.getString('employee'))
        const taxId = emp.getString('tax_id')
        const name = emp.getString('name')
        contextText = `Entidade do Documento: Colaborador\nCPF Esperado: ${taxId}\nNome Esperado: ${name}`
      } else if (e.record.getString('vehicle')) {
        const veh = $app.findRecordById('vehicles', e.record.getString('vehicle'))
        const plate = veh.getString('plate')
        const model = veh.getString('model')
        contextText = `Entidade do Documento: Veículo\nPlaca Esperada: ${plate}\nModelo Esperado: ${model}`
      } else {
        const userRecord = $app.findRecordById('users', userId)
        const taxId = userRecord.getString('tax_id')
        const name = userRecord.getString('legal_name') || userRecord.getString('name')
        contextText = `Entidade do Documento: Usuário Geral\nCPF/CNPJ Esperado: ${taxId}\nNome Esperado: ${name}`
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

    const promptMessage = `Analise o documento enviado.
ID do Documento: ${docId}
Tipo Esperado: ${defName}

Instruções Específicas:
${defInstructions || 'Nenhuma instrução adicional.'}

${contextText}

Data Atual (Referência): ${new Date().toISOString().split('T')[0]}

Instruções da Análise:
1. Acesse o arquivo associado ao registro de documento com ID ${docId}.
2. Legibilidade/Qualidade: Se o arquivo estiver ilegível, muito cortado, com resolução ruim ou orientação que impeça a leitura total, classifique como 'Rejected' imediatamente.
3. Correspondência de Tipo: Verifique se o arquivo realmente é do 'Tipo Esperado'.
4. Identificadores: 
   - Se Fornecedor/PJ: Extraia o CNPJ e compare. Considere válido se os primeiros 8 dígitos (raiz) baterem. 
   - Se Colaborador: Compare CPF/Nome.
   - Se Veículo: Extraia e compare a Placa (ou Chassi).
5. Autenticidade: Verifique se possui código de controle (control code), QR Code ou assinaturas caso seja comum para o tipo (ex: CND, contratos). 
6. Validade: Extraia a data de vencimento/validade no formato YYYY-MM-DD. Se a data for anterior à 'Data Atual', o status DEVE ser 'Vencido' e 'is_expired' = true.
7. Regra Final de Decisão: Retorne 'Approved' se todos os critérios essenciais estiverem atendidos; 'Rejected' se algo crítico falhar (ex. documento diferente, ilegível, divergência de CNPJ raiz); 'Vencido' se expirado; 'Aguardando Aprovação' em casos duvidosos ou que dependam de revisão humana.

RETORNE EXCLUSIVAMENTE UM JSON DE ACORDO COM O SCHEMA ESTABELECIDO, SEM CRASES DE MARKDOWN.`

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
              : `Retorne APENAS um JSON válido estrito. Erro anterior: ${lastError.message}`,
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
                  rejection_reason: { type: 'string' },
                  explanation: { type: 'string' },
                  extracted_expiration_date: {
                    type: 'string',
                    description: 'YYYY-MM-DD ou string vazia',
                  },
                  is_expired: { type: 'boolean' },
                  extracted_tax_id: {
                    type: 'string',
                    description: 'CNPJ/CPF extraído ou string vazia',
                  },
                  extracted_name: {
                    type: 'string',
                    description: 'Nome/Razão Social extraída ou string vazia',
                  },
                  extracted_plate: {
                    type: 'string',
                    description: 'Placa extraída ou string vazia',
                  },
                  control_code: {
                    type: 'string',
                    description: 'Código de validação, autenticação ou string vazia',
                  },
                  has_signature: { type: 'boolean' },
                  is_legible: { type: 'boolean' },
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
                  'extracted_plate',
                  'control_code',
                  'has_signature',
                  'is_legible',
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
        if (jsonMatch) jsonStr = jsonMatch[0]

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
        rejection_reason: 'Falha ao processar resposta da IA. Revisão manual necessária.',
        explanation: 'Falha no parser do JSON.',
        extracted_expiration_date: '',
        is_expired: false,
        extracted_tax_id: '',
        extracted_name: '',
        extracted_plate: '',
        control_code: '',
        has_signature: false,
        is_legible: true,
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
        analysisResult.rejection_reason ||
          analysisResult.explanation ||
          'Documento inválido ou ilegível.',
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
