migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.manageRule = "@request.auth.isAdmin = true || @request.auth.role = 'Admin'"
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('users')
    collection.manageRule = null
    app.save(collection)
  },
)
