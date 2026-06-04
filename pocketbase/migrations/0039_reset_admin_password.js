migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    const emailToFind = 'pamelafrantz@pamelafrantz.onmicrosoft.com'

    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', emailToFind)
      record.setPassword('Skip@2026')
      record.set('isAdmin', true)
      record.set('role', 'Admin')
      record.setVerified(true)
      app.save(record)
    } catch (_) {
      const record = new Record(users)
      record.setEmail(emailToFind)
      record.setPassword('Skip@2026')
      record.set('isAdmin', true)
      record.set('role', 'Admin')
      record.setVerified(true)
      record.set('name', 'Admin')
      app.save(record)
    }
  },
  (app) => {},
)
