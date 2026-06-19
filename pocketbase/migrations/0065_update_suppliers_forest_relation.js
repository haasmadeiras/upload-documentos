migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')
    const field = col.fields.getByName('forest_area')

    if (field) {
      // Setting to a high value to allow multiple selection.
      // In PocketBase, a maxSelect > 1 or null converts the field to hold an array of relations.
      field.maxSelect = 100
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
