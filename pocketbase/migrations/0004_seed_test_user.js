migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    try {
      app.findAuthRecordByEmail('users', 'pamelafrantz@pamelafrantz.onmicrosoft.com')
      return // already seeded
    } catch (_) {}

    const record = new Record(users)
    record.setEmail('pamelafrantz@pamelafrantz.onmicrosoft.com')
    record.setPassword('Skip@Pass')
    record.setVerified(true)
    record.set('name', 'Pamela Frantz')
    app.save(record)
  },
  (app) => {
    try {
      const record = app.findAuthRecordByEmail('users', 'pamelafrantz@pamelafrantz.onmicrosoft.com')
      app.delete(record)
    } catch (_) {}
  },
)
