migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const defCol = app.findCollectionByNameOrId('document_definitions')
    if (!col.fields.getByName('definition')) {
      col.fields.add(
        new RelationField({ name: 'definition', collectionId: defCol.id, maxSelect: 1 }),
      )
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    col.fields.removeByName('definition')
    app.save(col)
  },
)
