onRecordAfterUpdateSuccess((e) => {
  const fileChanged = e.record.getString('file') !== e.record.original().getString('file')
  if (!fileChanged) return e.next()

  try {
    const defId = e.record.getString('definition')
    if (!defId) return e.next()

    const def = $app.findRecordById('document_definitions', defId)
    const defName = def.getString('name') || ''
    if (!defName.toUpperCase().includes('CNPJ')) return e.next()

    const userId = e.record.getString('user')
    if (!userId) return e.next()

    const file = e.record.getString('file')
    if (!file) return e.next()

    const appUrl = $secrets.get('PB_INSTANCE_URL') || 'http://127.0.0.1:8090'
    const tokenRes = $http.send({
      url: `${appUrl}/api/files/token`,
      method: 'POST',
      headers: { Authorization: 'Bearer ' + $secrets.get('PB_SUPERUSER_TOKEN') },
    })

    let downloadUrl = `${appUrl}/api/files/${e.record.collectionId}/${e.record.id}/${file}`
    if (tokenRes.statusCode === 200 && tokenRes.json && tokenRes.json.token) {
      downloadUrl += `?token=${tokenRes.json.token}`
    }

    const result = $ai.agent('legal-document-reviewer').chat({
      user_id: userId,
      message: `Por favor, analise o documento disponível nesta URL e extraia os dados solicitados no formato JSON estrito: ${downloadUrl}`,
    })

    let jsonStr = result.content
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
    if (match) {
      jsonStr = match[1]
    }

    let parsed = JSON.parse(jsonStr.trim())

    let isApproved = true
    let reasons = []

    if (!parsed.isCnpjCard) {
      isApproved = false
      reasons.push('O documento não foi reconhecido como um Cartão CNPJ válido.')
    }

    const user = $app.findRecordById('users', userId)
    let expectedCnpj = user.getString('tax_id').replace(/\D/g, '')

    const supplierId = e.record.getString('supplier')
    if (supplierId) {
      try {
        const supplier = $app.findRecordById('suppliers', supplierId)
        const sCnpj = supplier.getString('tax_id').replace(/\D/g, '')
        if (sCnpj) expectedCnpj = sCnpj
      } catch (_) {}
    }

    const extractedCnpj = (parsed.cnpj || '').replace(/\D/g, '')
    if (isApproved && extractedCnpj !== expectedCnpj) {
      isApproved = false
      reasons.push(
        `O CNPJ do documento (${extractedCnpj}) não corresponde ao CNPJ cadastrado (${expectedCnpj}).`,
      )
    }

    if (isApproved && parsed.emissionDate) {
      const emissionDate = new Date(parsed.emissionDate)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - emissionDate.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      if (diffDays > 30) {
        isApproved = false
        reasons.push(`O documento foi emitido há mais de 30 dias (${parsed.emissionDate}).`)
      }
    } else if (isApproved && !parsed.emissionDate) {
      isApproved = false
      reasons.push('Não foi possível identificar a Data de Emissão no documento.')
    }

    const finalStatus = isApproved ? 'Approved' : 'Rejected'

    const doc = $app.findRecordById('documents', e.record.id)
    doc.set('status', finalStatus)
    doc.set('rejection_reason', isApproved ? '' : reasons.join(' '))
    doc.set('analysis_log', {
      ai_response: parsed,
      reasons: reasons,
      evaluated_at: new Date().toISOString(),
    })
    $app.save(doc)

    const auditLog = new Record($app.findCollectionByNameOrId('audit_logs'))
    auditLog.set('target_user', userId)
    auditLog.set('action', 'Status Change')
    auditLog.set('details', {
      document_id: e.record.id,
      document_title: e.record.getString('title'),
      old_status: e.record.original().getString('status'),
      new_status: finalStatus,
      reasons: reasons,
      automated: true,
    })
    $app.save(auditLog)
  } catch (err) {
    $app.logger().error('CNPJ analysis failed', 'error', err.message, 'docId', e.record.id)
    try {
      const doc = $app.findRecordById('documents', e.record.id)
      doc.set('status', 'Rejected')
      doc.set(
        'rejection_reason',
        'Falha na análise automática do documento via IA. Verifique se o arquivo está legível.',
      )
      doc.set('analysis_log', { error: err.message })
      $app.save(doc)
    } catch (_) {}
  }
  return e.next()
}, 'documents')
