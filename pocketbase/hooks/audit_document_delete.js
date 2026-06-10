onRecordDeleteRequest((e) => {
  e.next()

  try {
    const logsCol = $app.findCollectionByNameOrId('audit_logs')
    const log = new Record(logsCol)

    if (e.auth) {
      log.set('admin_user', e.auth.id)
    }

    const docUserId = e.record.get('user')
    if (docUserId) {
      log.set('target_user', docUserId)
    }

    log.set('action', 'Delete')
    log.set('details', {
      collection: 'documents',
      document_id: e.record.id,
      title: e.record.get('title'),
    })

    $app.saveNoValidate(log)
  } catch (err) {
    $app.logger().error('Error saving audit log for document delete', 'error', err.message)
  }
}, 'documents')
