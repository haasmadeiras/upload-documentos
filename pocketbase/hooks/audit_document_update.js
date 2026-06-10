onRecordAfterUpdateSuccess((e) => {
  const fileChanged = e.record.getString('file') !== e.record.original().getString('file')
  const statusChanged = e.record.getString('status') !== e.record.original().getString('status')

  if (!fileChanged && !statusChanged) {
    return e.next()
  }

  const auditLogs = $app.findCollectionByNameOrId('audit_logs')
  const record = new Record(auditLogs)
  record.set('action', statusChanged && !fileChanged ? 'Status Change' : 'Update')

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
    changes: {
      file: fileChanged,
      status: statusChanged ? e.record.getString('status') : undefined,
    },
  })

  $app.save(record)
  return e.next()
}, 'documents')
