migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.updateRule =
      "id = @request.auth.id || @request.auth.isAdmin = true || @request.auth.role = 'Admin' || (@request.auth.role = 'Colaborador' && role = 'Fornecedor')"
    collection.deleteRule =
      "id = @request.auth.id || @request.auth.isAdmin = true || @request.auth.role = 'Admin' || (@request.auth.role = 'Colaborador' && role = 'Fornecedor')"
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.updateRule =
      "id = @request.auth.id || @request.auth.isAdmin = true || @request.auth.role = 'Admin'"
    collection.deleteRule =
      "id = @request.auth.id || @request.auth.isAdmin = true || @request.auth.role = 'Admin'"
    app.save(collection)
  },
)
