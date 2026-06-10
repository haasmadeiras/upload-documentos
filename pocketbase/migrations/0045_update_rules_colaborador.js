migrate(
  (app) => {
    const updateRules = (colName, baseUserRule) => {
      try {
        const col = app.findCollectionByNameOrId(colName)
        const adminRule =
          "@request.auth.isAdmin = true || @request.auth.role = 'Admin' || @request.auth.role = 'Colaborador'"
        col.listRule = baseUserRule ? `${adminRule} || ${baseUserRule}` : adminRule
        col.viewRule = baseUserRule ? `${adminRule} || ${baseUserRule}` : adminRule
        app.save(col)
      } catch (_) {}
    }

    updateRules('suppliers', '')
    updateRules('documents', 'user = @request.auth.id')
    updateRules('users', 'id = @request.auth.id')
    updateRules('employees', 'user = @request.auth.id')
    updateRules('vehicles', 'user = @request.auth.id')
    updateRules('contracts', 'user = @request.auth.id')
    updateRules('forest_areas', 'user = @request.auth.id')
  },
  (app) => {},
)
