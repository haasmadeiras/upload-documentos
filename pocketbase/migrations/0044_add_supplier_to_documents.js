migrate(
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    docs.fields.add(
      new RelationField({
        name: 'supplier',
        collectionId: app.findCollectionByNameOrId('suppliers').id,
        maxSelect: 1,
        required: false,
      }),
    )
    app.save(docs)
  },
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    docs.fields.removeByName('supplier')
    app.save(docs)
  },
)
