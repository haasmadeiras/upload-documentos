migrate(
  (app) => {
    const employees = app.findCollectionByNameOrId('employees')
    if (!employees.fields.getByName('forest_area')) {
      employees.fields.add(
        new RelationField({
          name: 'forest_area',
          collectionId: app.findCollectionByNameOrId('forest_areas').id,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    employees.listRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    employees.viewRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    employees.updateRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    employees.deleteRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    app.save(employees)

    const vehicles = app.findCollectionByNameOrId('vehicles')
    if (!vehicles.fields.getByName('user')) {
      vehicles.fields.add(
        new RelationField({
          name: 'user',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!vehicles.fields.getByName('forest_area')) {
      vehicles.fields.add(
        new RelationField({
          name: 'forest_area',
          collectionId: app.findCollectionByNameOrId('forest_areas').id,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    vehicles.listRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    vehicles.viewRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    vehicles.createRule = "@request.auth.id != ''"
    vehicles.updateRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    vehicles.deleteRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    app.save(vehicles)

    const forestAreas = app.findCollectionByNameOrId('forest_areas')
    if (!forestAreas.fields.getByName('user')) {
      forestAreas.fields.add(
        new RelationField({
          name: 'user',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: false,
        }),
      )
    }
    forestAreas.listRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    forestAreas.viewRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    app.save(forestAreas)

    const contracts = app.findCollectionByNameOrId('contracts')
    if (!contracts.fields.getByName('user')) {
      contracts.fields.add(
        new RelationField({
          name: 'user',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!contracts.fields.getByName('forest_area')) {
      contracts.fields.add(
        new RelationField({
          name: 'forest_area',
          collectionId: app.findCollectionByNameOrId('forest_areas').id,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    contracts.listRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    contracts.viewRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    contracts.createRule = "@request.auth.id != ''"
    contracts.updateRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    contracts.deleteRule =
      "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || user = @request.auth.id"
    app.save(contracts)

    employees.addIndex('idx_employees_forest', false, 'forest_area', '')
    vehicles.addIndex('idx_vehicles_user', false, 'user', '')
    vehicles.addIndex('idx_vehicles_forest', false, 'forest_area', '')
    forestAreas.addIndex('idx_forest_user', false, 'user', '')
    contracts.addIndex('idx_contracts_user', false, 'user', '')
    contracts.addIndex('idx_contracts_forest', false, 'forest_area', '')

    app.save(employees)
    app.save(vehicles)
    app.save(forestAreas)
    app.save(contracts)
  },
  (app) => {},
)
