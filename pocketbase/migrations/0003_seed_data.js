migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'pamelafrantz@pamelafrantz.onmicrosoft.com',
      )
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail('pamelafrantz@pamelafrantz.onmicrosoft.com')
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Pamela Frantz')
      app.save(userRecord)
    }

    const documents = app.findCollectionByNameOrId('documents')
    try {
      app.findFirstRecordByData('documents', 'title', 'Contrato Social')
    } catch (_) {
      const doc1 = new Record(documents)
      doc1.set('title', 'Contrato Social')
      doc1.set('status', 'Pending')
      doc1.set('user', userRecord.id)
      app.saveNoValidate(doc1)
    }

    try {
      app.findFirstRecordByData('documents', 'title', 'Certidão Negativa')
    } catch (_) {
      const doc2 = new Record(documents)
      doc2.set('title', 'Certidão Negativa')
      doc2.set('status', 'Approved')
      doc2.set('user', userRecord.id)
      app.saveNoValidate(doc2)
    }
  },
  (app) => {
    try {
      const userRecord = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'pamelafrantz@pamelafrantz.onmicrosoft.com',
      )
      app.delete(userRecord)
    } catch (_) {}
  },
)
