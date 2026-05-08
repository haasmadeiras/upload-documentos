migrate(
  (app) => {
    const collection = new Collection({
      name: 'documents',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'file', type: 'file', required: true, maxSelect: 1, maxSize: 52428800 },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Pending', 'Approved', 'Rejected'],
        },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('documents')
    app.delete(collection)
  },
)
