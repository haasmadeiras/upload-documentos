migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    if (!col.fields.getByName('active')) {
      col.fields.add(new BoolField({ name: 'active' }))
    }
    app.save(col)

    // Default existing users to active
    app.db().newQuery('UPDATE users SET active = 1').execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('_pb_users_auth_')
    col.fields.removeByName('active')
    app.save(col)
  },
)
