migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')

    if (!col.fields.getByName('address')) {
      col.fields.add(new TextField({ name: 'address' }))
    }
    if (!col.fields.getByName('external_code')) {
      col.fields.add(new TextField({ name: 'external_code' }))
    }

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')
    col.fields.removeByName('address')
    col.fields.removeByName('external_code')
    app.save(col)
  },
)
