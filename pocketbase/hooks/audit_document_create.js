onRecordAfterCreateSuccess((e) => {
  const auditLogs = $app.findCollectionByNameOrId('audit_logs')
  const record = new Record(auditLogs)
  record.set('action', 'Create')

  if (e.auth) {
    if (e.auth.getString('role') === 'Admin' || e.auth.getBool('isAdmin')) {
      record.set('admin_user', e.auth.id)
    } else {
      record.set('target_user', e.auth.id)
    }
  }

  record.set('details', {
    collection: 'documents',
    recordId: e.record.id,
    title: e.record.getString('title'),
    message: 'Document created',
  })

  $app.save(record)
  return e.next()
}, 'documents')
