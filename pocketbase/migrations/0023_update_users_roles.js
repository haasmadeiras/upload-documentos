migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')

    col.fields.add(
      new SelectField({
        name: 'role',
        values: ['Admin', 'Colaborador', 'Fornecedor'],
        maxSelect: 1,
      }),
    )
    col.fields.add(new TextField({ name: 'phone' }))
    col.fields.add(new TextField({ name: 'legal_name' }))

    col.listRule =
      "id = @request.auth.id || @request.auth.isAdmin = true || @request.auth.role = 'Admin'"
    col.viewRule =
      "id = @request.auth.id || @request.auth.isAdmin = true || @request.auth.role = 'Admin'"
    col.updateRule =
      "id = @request.auth.id || @request.auth.isAdmin = true || @request.auth.role = 'Admin'"
    col.deleteRule =
      "id = @request.auth.id || @request.auth.isAdmin = true || @request.auth.role = 'Admin'"

    app.save(col)

    try {
      app.db().newQuery("UPDATE users SET role = 'Admin' WHERE isAdmin = true").execute()
      app
        .db()
        .newQuery("UPDATE users SET role = 'Fornecedor' WHERE role IS NULL OR role = ''")
        .execute()
    } catch (err) {
      console.log('Error updating existing users:', err)
    }

    const colAfter = app.findCollectionByNameOrId('_pb_users_auth_')
    const roleField = colAfter.fields.getByName('role')
    if (roleField) {
      roleField.required = true
      app.save(colAfter)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    if (col.fields.getByName('role')) col.fields.removeByName('role')
    if (col.fields.getByName('phone')) col.fields.removeByName('phone')
    if (col.fields.getByName('legal_name')) col.fields.removeByName('legal_name')

    col.listRule = 'id = @request.auth.id'
    col.viewRule = 'id = @request.auth.id'
    col.updateRule = 'id = @request.auth.id'
    col.deleteRule = 'id = @request.auth.id'

    app.save(col)
  },
)
