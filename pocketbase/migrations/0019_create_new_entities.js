migrate(
  (app) => {
    const vehicles = new Collection({
      name: 'vehicles',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.isAdmin = true',
      updateRule: '@request.auth.isAdmin = true',
      deleteRule: '@request.auth.isAdmin = true',
      fields: [
        { name: 'plate', type: 'text', required: true },
        { name: 'model', type: 'text', required: true },
        { name: 'brand', type: 'text', required: true },
        { name: 'year', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(vehicles)

    const contracts = new Collection({
      name: 'contracts',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.isAdmin = true',
      updateRule: '@request.auth.isAdmin = true',
      deleteRule: '@request.auth.isAdmin = true',
      fields: [
        { name: 'contract_number', type: 'text', required: true },
        { name: 'description', type: 'text' },
        { name: 'start_date', type: 'date' },
        { name: 'end_date', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(contracts)

    const forestAreas = new Collection({
      name: 'forest_areas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: '@request.auth.isAdmin = true',
      updateRule: '@request.auth.isAdmin = true',
      deleteRule: '@request.auth.isAdmin = true',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'registration_number', type: 'text' },
        { name: 'location', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
    })
    app.save(forestAreas)
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId('vehicles'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('contracts'))
    } catch (e) {}
    try {
      app.delete(app.findCollectionByNameOrId('forest_areas'))
    } catch (e) {}
  },
)
