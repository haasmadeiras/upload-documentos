migrate(
  (app) => {
    const collection = new Collection({
      name: 'audit_logs',
      type: 'base',
      listRule: "@request.auth.isAdmin = true || @request.auth.role = 'Admin'",
      viewRule: "@request.auth.isAdmin = true || @request.auth.role = 'Admin'",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        {
          name: 'admin_user',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'target_user',
          type: 'relation',
          required: false,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
        },
        {
          name: 'action',
          type: 'select',
          required: true,
          values: ['Update', 'Delete', 'Status Change', 'Create'],
        },
        { name: 'details', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('audit_logs')
    app.delete(collection)
  },
)
