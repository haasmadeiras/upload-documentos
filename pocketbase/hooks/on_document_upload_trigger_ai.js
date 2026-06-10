onRecordAfterCreateSuccess((e) => {
  if (e.record.getString('status') !== 'Pending') return e.next()

  try {
    const docId = e.record.id
    const userId = e.record.getString('user')
    const filename = e.record.getString('file')
    const collectionId = e.record.collectionId
    const baseUrl = $secrets.get('PB_INSTANCE_URL') || 'http://localhost:8090'
    const fileUrl = `${baseUrl}/api/files/${collectionId}/${docId}/${filename}`

    let userTaxId = ''
    try {
      const userRecord = $app.findRecordById('users', userId)
      userTaxId = userRecord.getString('tax_id')
    } catch (err) {
      console.log('User not found or no tax_id:', err.message)
    }

    const reply = $ai.chat({
      model: 'fast',
      messages: [
        {
          role: 'system',
          content: `You are an expert legal document analyst. Your task is to extract information from documents (especially CNPJ cards) via their URLs and validate them against user data. Always respond in pure JSON format without any markdown wrappers (no \`\`\`json).`,
        },
        {
          role: 'user',
          content: `Please analyze this uploaded document.
Document URL: ${fileUrl}
Expected Tax ID (CNPJ): ${userTaxId}

Instructions:
1. Access and read the document at the provided URL.
2. Determine if it is a "Comprovante de Inscrição e de Situação Cadastral" (CNPJ Card).
3. Extract the CNPJ and Razão Social (Corporate Name).
4. Extract the issuance date and determine if it was issued within the last 30 days.

Rules:
- If the document is password-protected or unreadable, set status to "error" and reason to "Document unreadable or protected. Please upload a clear, unprotected PDF."
- If the extracted CNPJ does not match the Expected Tax ID, set status to "invalid" and reason to "CNPJ in document does not match registered CNPJ".
- If it is not a CNPJ card, set status to "invalid" and reason to "Tipo de Documento Inválido".
- If the issuance date is older than 30 days, set status to "invalid" and reason to "Documento Expirado".
- If all checks pass, set status to "valid".

Output format (JSON only):
{
  "status": "valid" | "invalid" | "error",
  "reason": "Explain the rejection if invalid or error. Leave empty if valid.",
  "extracted": {
    "cnpj": "extracted or null",
    "razao_social": "extracted or null",
    "issuance_date": "extracted or null"
  }
}`,
        },
      ],
    })

    const resultText = reply.choices[0].message.content
    let analysisResult = {}
    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/)
      analysisResult = JSON.parse(jsonMatch ? jsonMatch[0] : resultText)
    } catch (err) {
      analysisResult = { status: 'error', reason: 'Failed to parse AI response: ' + resultText }
    }

    const docRecord = $app.findRecordById('documents', docId)
    docRecord.set('analysis_log', analysisResult)

    if (analysisResult.status === 'valid') {
      docRecord.set('status', 'Pending Final Approval')
    } else {
      docRecord.set('status', 'Rejected')
      docRecord.set('rejection_reason', analysisResult.reason || 'Document failed validation.')
    }

    $app.save(docRecord)
  } catch (err) {
    console.log('Failed to trigger AI analyst:', err.message)
    try {
      const docRecord = $app.findRecordById('documents', e.record.id)
      docRecord.set('status', 'Rejected')
      docRecord.set(
        'rejection_reason',
        'Erro interno na análise automática. Por favor, tente novamente.',
      )
      docRecord.set('analysis_log', { error: err.message })
      $app.save(docRecord)
    } catch (saveErr) {}
  }

  return e.next()
}, 'documents')
