migrate(
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')

    const vehiclesId = app.findCollectionByNameOrId('vehicles').id
    docs.fields.add(
      new RelationField({
        name: 'vehicle',
        collectionId: vehiclesId,
        maxSelect: 1,
      }),
    )

    const contractsId = app.findCollectionByNameOrId('contracts').id
    docs.fields.add(
      new RelationField({
        name: 'contract',
        collectionId: contractsId,
        maxSelect: 1,
      }),
    )

    const forestAreasId = app.findCollectionByNameOrId('forest_areas').id
    docs.fields.add(
      new RelationField({
        name: 'forest_area',
        collectionId: forestAreasId,
        maxSelect: 1,
      }),
    )

    app.save(docs)
  },
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    docs.fields.removeByName('vehicle')
    docs.fields.removeByName('contract')
    docs.fields.removeByName('forest_area')
    app.save(docs)
  },
)
