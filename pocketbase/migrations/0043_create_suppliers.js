migrate(
  (app) => {
    const suppliers = new Collection({
      name: 'suppliers',
      type: 'base',
      listRule: "@request.auth.isAdmin = true || @request.auth.role = 'Admin'",
      viewRule: "@request.auth.isAdmin = true || @request.auth.role = 'Admin'",
      createRule: "@request.auth.isAdmin = true || @request.auth.role = 'Admin'",
      updateRule: "@request.auth.isAdmin = true || @request.auth.role = 'Admin'",
      deleteRule: "@request.auth.isAdmin = true || @request.auth.role = 'Admin'",
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'legal_name', type: 'text' },
        { name: 'tax_id', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'person_type', type: 'select', required: true, values: ['PF', 'PJ'], maxSelect: 1 },
        { name: 'phone', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [],
    })
    app.save(suppliers)

    const users = app.findCollectionByNameOrId('users')
    users.fields.add(
      new RelationField({
        name: 'supplier',
        collectionId: suppliers.id,
        maxSelect: 1,
      }),
    )
    app.save(users)
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('supplier')
    app.save(users)

    const suppliers = app.findCollectionByNameOrId('suppliers')
    app.delete(suppliers)
  },
)
