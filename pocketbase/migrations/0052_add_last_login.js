migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.add(new DateField({ name: 'last_login' }))
    app.save(users)

    const auditLogs = app.findCollectionByNameOrId('audit_logs')
    const actionField = auditLogs.fields.getByName('action')
    if (!actionField.values.includes('Login')) {
      actionField.values = [...actionField.values, 'Login']
    }
    app.save(auditLogs)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('last_login')
    app.save(users)

    const auditLogs = app.findCollectionByNameOrId('audit_logs')
    const actionField = auditLogs.fields.getByName('action')
    actionField.values = actionField.values.filter((v) => v !== 'Login')
    app.save(auditLogs)
  },
)
