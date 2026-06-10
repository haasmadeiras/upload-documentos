migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')
    col.fields.add(
      new RelationField({
        name: 'forest_area',
        collectionId: app.findCollectionByNameOrId('forest_areas').id,
        maxSelect: 1,
        cascadeDelete: false,
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')
    col.fields.removeByName('forest_area')
    app.save(col)
  },
)
