migrate(
  (app) => {
    const otps = new Collection({
      name: 'otps',
      type: 'base',
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'email', type: 'email', required: true },
        { name: 'code', type: 'text', required: true },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(otps)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('otps')
    app.delete(col)
  },
)
