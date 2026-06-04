migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')

    // Ensure password length rule allows 6 chars
    const pwdField = users.fields.getByName('password')
    if (pwdField) {
      pwdField.min = 6
      app.save(users)
    }

    const emailToFind = 'pamelafrantz@pamelafrantz.onmicrosoft.com'

    try {
      const record = app.findAuthRecordByEmail('_pb_users_auth_', emailToFind)
      record.setPassword('123456')
      record.set('isAdmin', true)
      record.set('role', 'Admin')
      record.setVerified(true)
      app.save(record)
    } catch (_) {
      const record = new Record(users)
      record.setEmail(emailToFind)
      record.setPassword('123456')
      record.set('isAdmin', true)
      record.set('role', 'Admin')
      record.setVerified(true)
      record.set('name', 'Admin')
      app.save(record)
    }
  },
  (app) => {},
)
