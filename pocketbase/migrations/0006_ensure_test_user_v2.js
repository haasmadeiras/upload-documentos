migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const email = 'pamelafrantz@pamelafrantz.onmicrosoft.com'

    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', email)
      record.setPassword('Skip@2026')
      app.save(record)
    } catch (_) {
      const record = new Record(users)
      record.setEmail(email)
      record.setPassword('Skip@2026')
      record.setVerified(true)
      record.set('name', 'Admin')
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'pamelafrantz@pamelafrantz.onmicrosoft.com',
      )
      record.setPassword('Skip@Pass')
      app.save(record)
    } catch (_) {}
  },
)
