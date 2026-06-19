migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')
    const field = col.fields.getByName('forest_area')
    if (field) {
      field.maxSelect = 0
      app.save(col)
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')
    const field = col.fields.getByName('forest_area')
    if (field) {
      field.maxSelect = 1
      app.save(col)
    }
  },
)
