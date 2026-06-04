migrate(
  (app) => {
    const collection = new Collection({
      name: 'registration_logs',
      type: 'base',
      listRule: "@request.auth.isAdmin = true || @request.auth.role = 'Admin'",
      viewRule: "@request.auth.isAdmin = true || @request.auth.role = 'Admin'",
      createRule: '',
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'tax_id', type: 'text', required: true },
        { name: 'email', type: 'text', required: true },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['success', 'failure'],
          maxSelect: 1,
        },
        { name: 'error_message', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('registration_logs')
    app.delete(collection)
  },
)
