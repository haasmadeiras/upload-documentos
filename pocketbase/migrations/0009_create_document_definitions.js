migrate(
  (app) => {
    const categoryCol = app.findCollectionByNameOrId('document_categories')
    const collection = new Collection({
      name: 'document_definitions',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.isAdmin = true',
      updateRule: '@request.auth.isAdmin = true',
      deleteRule: '@request.auth.isAdmin = true',
      fields: [
        {
          name: 'category',
          type: 'relation',
          required: true,
          collectionId: categoryCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'is_mandatory', type: 'bool' },
        { name: 'validity_days', type: 'number', min: 0 },
        { name: 'allowed_formats', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('document_definitions')
    app.delete(collection)
  },
)
