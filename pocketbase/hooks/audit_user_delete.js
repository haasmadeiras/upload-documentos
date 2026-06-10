onRecordDeleteRequest((e) => {
  if (e.auth) {
    const col = $app.findCollectionByNameOrId('audit_logs')
    const record = new Record(col)
    record.set('admin_user', e.auth.id)
    record.set('target_user', e.record.id)
    record.set('action', 'Delete')
    record.set('details', { email: e.record.getString('email') })

    try {
      $app.saveNoValidate(record)
    } catch (err) {
      $app.logger().error('Failed to save delete audit log', 'error', err.message)
    }
  }
  return e.next()
}, 'users')
