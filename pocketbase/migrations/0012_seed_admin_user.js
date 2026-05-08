migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    try {
      const record = app.findAuthRecordByEmail('users', 'pamelafrantz@pamelafrantz.onmicrosoft.com')
      record.setPassword('Skip@2026')
      record.set('isAdmin', true)
      app.save(record)
    } catch (_) {
      const record = new Record(users)
      record.setEmail('pamelafrantz@pamelafrantz.onmicrosoft.com')
      record.setPassword('Skip@2026')
      record.setVerified(true)
      record.set('name', 'Admin')
      record.set('isAdmin', true)
      app.save(record)
    }
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'pamelafrantz@pamelafrantz.onmicrosoft.com')
      record.set('isAdmin', false)
      app.save(record)
    } catch (_) {}
  },
)
