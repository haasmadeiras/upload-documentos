onRecordAuthRequest((e) => {
  e.next()

  try {
    const userId = e.record?.id
    if (!userId) return

    const record = $app.findRecordById('users', userId)
    record.set('last_login', new Date().toISOString())
    $app.saveNoValidate(record)

    const auditLogs = $app.findCollectionByNameOrId('audit_logs')
    const log = new Record(auditLogs)
    log.set('target_user', userId)
    log.set('action', 'Login')
    $app.saveNoValidate(log)
  } catch (err) {
    $app.logger().error('login tracker failed', 'error', err.message)
  }
}, 'users')
