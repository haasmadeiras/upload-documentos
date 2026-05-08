migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    if (!col.fields.getByName('isAdmin')) {
      col.fields.add(new BoolField({ name: 'isAdmin' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.fields.removeByName('isAdmin')
    app.save(col)
  },
)
