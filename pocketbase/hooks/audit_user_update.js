onRecordUpdateRequest((e) => {
  if (e.auth) {
    const col = $app.findCollectionByNameOrId('audit_logs')
    const record = new Record(col)
    record.set('admin_user', e.auth.id)
    record.set('target_user', e.record.id)

    const body = e.requestInfo().body || {}
    if ('active' in body) {
      record.set('action', 'Status Change')
      record.set('details', { active: body.active })
    } else {
      record.set('action', 'Update')
      record.set('details', { changes: 'Profile updated' })
    }

    try {
      $app.saveNoValidate(record)
    } catch (err) {
      $app.logger().error('Failed to save update audit log', 'error', err.message)
    }
  }
  return e.next()
}, 'users')
