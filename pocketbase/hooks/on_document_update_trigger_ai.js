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

    const result = $ai.agent('document-analyst').chat({
      user_id: userId,
      message: `Por favor, analise o documento recém-enviado.
ID do Registro do Documento: ${docId}
Tipo de Documento Esperado: ${defName}
Instruções Específicas de Validação: ${defInstructions ? defInstructions : 'Nenhuma instrução específica.'}
CNPJ/CPF Esperado: ${expectedTaxId}
Nome/Razão Social Esperado: ${expectedName}
Data Atual: ${new Date().toISOString().split('T')[0]}

Instruções:
1. Use a ferramenta 'documents' para ler o registro do documento fornecido e analisar o arquivo anexado (use capacidades de visão).
2. Verifique se o documento corresponde ao 'Tipo de Documento Esperado'.
3. Extraia o CNPJ/CPF. Especificamente para Certidão Negativa de Débitos (CND), extraia o CNPJ base/raiz (8 primeiros dígitos) e valide com o CNPJ/CPF Esperado considerando correspondência fuzzy/base.
4. Extraia o Nome/Razão Social e verifique se corresponde ao esperado usando fuzzy matching (tolere pequenas diferenças e abreviações).
5. Siga rigorosamente as 'Instruções Específicas de Validação' se houver.
6. Extraia a data de validade (expiration_date) no formato YYYY-MM-DD.
7. Se a data de validade extraída for anterior à 'Data Atual', defina is_expired como true e classifique o status como 'Vencido'.
8. Se os dados de CNPJ/CPF ou Nome não corresponderem, classifique como 'Rejected' com os devidos detalhes em explanation.

RETORNE APENAS um JSON estrito no seguinte formato e nada mais:
{
  "status": "Approved" | "Rejected" | "Aguardando Aprovação" | "Vencido",
  "explanation": "Explicação detalhada em caso de rejeição, vencimento ou dúvida. Vazio se Approved.",
  "extracted_expiration_date": "YYYY-MM-DD",
  "is_expired": boolean,
  "extracted_tax_id": "string",
  "extracted_name": "string",
  "match_confidence": "High" | "Medium" | "Low"
}`,
    })

    let analysisResult = {}
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/)
      analysisResult = JSON.parse(jsonMatch ? jsonMatch[0] : result.content)
    } catch (err) {
      analysisResult = {
        status: 'Aguardando Aprovação',
        reason: 'Falha ao processar resposta da IA.',
        raw: result.content,
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
        analysisResult.explanation || analysisResult.reason || 'Documento inválido.',
      )
    } else if (analysisResult.status === 'Vencido' || analysisResult.is_expired) {
      docRecord.set('status', 'Vencido')
      docRecord.set(
        'rejection_reason',
        analysisResult.explanation || analysisResult.reason || 'Documento vencido.',
      )
    } else {
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set(
        'rejection_reason',
        analysisResult.explanation || analysisResult.reason || 'Necessita de revisão humana.',
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

          if (expDate < Date.now() && docRecord.getString('status') === 'Approved') {
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
