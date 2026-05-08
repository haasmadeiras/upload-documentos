migrate(
  (app) => {
    const collection = new Collection({
      name: 'employees',
      type: 'base',
      listRule: '@request.auth.isAdmin = true || user = @request.auth.id',
      viewRule: '@request.auth.isAdmin = true || user = @request.auth.id',
      createRule: '@request.auth.isAdmin = true || user = @request.auth.id',
      updateRule: '@request.auth.isAdmin = true || user = @request.auth.id',
      deleteRule: '@request.auth.isAdmin = true || user = @request.auth.id',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'tax_id', type: 'text', required: true },
        {
          name: 'role',
          type: 'select',
          required: true,
          values: ['motorista', 'operador', 'outros'],
        },
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('employees')
    app.delete(collection)
  },
)
