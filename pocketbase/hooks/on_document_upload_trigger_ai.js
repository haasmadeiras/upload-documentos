onRecordAfterCreateSuccess((e) => {
  if (e.record.getString('status') !== 'Pending') return e.next()

  try {
    const docId = e.record.id
    const userId = e.record.getString('user')
    const filename = e.record.getString('file')
    const baseUrl = $secrets.get('PB_INSTANCE_URL') || 'http://localhost:8090'
    const fileUrl = `${baseUrl}/api/files/documents/${docId}/${filename}`

    $ai.agent('legal-document-analyst').chat({
      user_id: userId,
      message: `A new document was just uploaded. Document ID: ${docId}. The file can be accessed at: ${fileUrl}. Please analyze it according to your system prompt instructions. Verify the CNPJ match, recency for Cartão CNPJ (within 30 days), and document type. Determine its status (Approved or Rejected), set the rejection_reason if applicable ("CNPJ Divergente", "Documento Expirado", or "Tipo de Documento Inválido"), and update the document's analysis_log.`,
    })
  } catch (err) {
    console.log('Failed to trigger AI analyst:', err.message)
  }

  return e.next()
}, 'documents')
