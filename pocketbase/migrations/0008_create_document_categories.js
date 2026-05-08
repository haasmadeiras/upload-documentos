migrate(
  (app) => {
    const collection = new Collection({
      name: 'document_categories',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.isAdmin = true',
      updateRule: '@request.auth.isAdmin = true',
      deleteRule: '@request.auth.isAdmin = true',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('document_categories')
    app.delete(collection)
  },
)
