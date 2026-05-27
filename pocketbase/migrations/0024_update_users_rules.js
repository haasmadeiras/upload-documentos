migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = "@request.auth.isAdmin = true || @request.auth.role = 'Admin'"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = ''
    app.save(users)
  },
)
