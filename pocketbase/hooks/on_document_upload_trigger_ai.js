onRecordAfterCreateSuccess((e) => {
  if (e.record.getString('status') !== 'Pending') return e.next()

  try {
    const docId = e.record.id
    const userId = e.record.getString('user')

    let userTaxId = ''
    try {
      const userRecord = $app.findRecordById('users', userId)
      userTaxId = userRecord.getString('tax_id')
    } catch (err) {
      console.log('User not found or no tax_id:', err.message)
    }

    const result = $ai.agent('legal-document-analyst').chat({
      user_id: userId,
      message: `Por favor, analise o documento recém-enviado.
ID do Registro na coleção documents: ${docId}
CNPJ Esperado do Usuário: ${userTaxId}

Instruções:
1. Use sua ferramenta para ler o registro do documento de ID fornecido e analise o arquivo anexado a ele (use capacidades de visão para extrair texto se for imagem ou PDF escaneado).
2. Determine se o documento é um "Comprovante de Inscrição e de Situação Cadastral" (Cartão CNPJ).
3. Extraia o CNPJ e a Razão Social presentes no documento.
4. Verifique a data de emissão no documento. Verifique se a data de emissão é mais antiga que 30 dias a partir de hoje.

Regras de Rejeição:
- Se o arquivo for ilegível, protegido por senha ou não for possível extrair o texto, status = "error", reason = "Documento ilegível ou protegido."
- Se o CNPJ extraído não for igual ao CNPJ Esperado (${userTaxId}), status = "invalid", reason = "CNPJ no documento não corresponde ao CNPJ cadastrado."
- Se não for um "Comprovante de Inscrição e de Situação Cadastral", status = "invalid", reason = "Tipo de Documento Inválido."
- Se a data de emissão for mais de 30 dias atrás, status = "invalid", reason = "Documento Expirado."

Se tudo estiver correto e as regras não forem violadas, status = "valid", reason = "".

RETORNE APENAS um JSON estrito no seguinte formato e nada mais (sem blocos markdown):
{
  "status": "valid" | "invalid" | "error",
  "reason": "Explicação da rejeição. Vazio se válido.",
  "extracted": {
    "cnpj": "cnpj extraído ou null",
    "razao_social": "razao_social ou null",
    "issuance_date": "data de emissão ou null"
  }
}`,
    })

    const resultText = result.content
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
      docRecord.set('rejection_reason', '')
    } else {
      docRecord.set('status', 'Rejected')
      docRecord.set('rejection_reason', analysisResult.reason || 'Falha na validação do documento.')
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
