migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule =
      "(@request.auth.id != '' && (@request.auth.isAdmin = true || @request.auth.role = 'Admin')) || (@request.body.role = 'Fornecedor' && @request.body.isAdmin = false)"
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.createRule = "@request.auth.isAdmin = true || @request.auth.role = 'Admin'"
    app.save(users)
  },
)
