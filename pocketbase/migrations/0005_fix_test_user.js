migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    try {
      const record = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'pamelafrantz@pamelafrantz.onmicrosoft.com',
      )
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      app.save(record)
    } catch (_) {
      const record = new Record(users)
      record.setEmail('pamelafrantz@pamelafrantz.onmicrosoft.com')
      record.setPassword('Skip@Pass')
      record.setVerified(true)
      record.set('name', 'Admin')
      app.save(record)
    }
  },
  (app) => {
    // Forward-only migration for data fixing
  },
)
