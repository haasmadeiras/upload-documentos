migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (!users.fields.getByName('address')) {
      users.fields.add(new TextField({ name: 'address' }))
      app.save(users)
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId('users')
    if (users.fields.getByName('address')) {
      users.fields.removeByName('address')
      app.save(users)
    }
  },
)
