migrate(
  (app) => {
    const forestAreas = app.findCollectionByNameOrId('forest_areas')

    if (!forestAreas.fields.getByName('supplier')) {
      forestAreas.fields.add(
        new RelationField({
          name: 'supplier',
          collectionId: app.findCollectionByNameOrId('suppliers').id,
          maxSelect: 1,
        }),
      )
    }
    if (!forestAreas.fields.getByName('start_date')) {
      forestAreas.fields.add(new DateField({ name: 'start_date' }))
    }
    if (!forestAreas.fields.getByName('end_date')) {
      forestAreas.fields.add(new DateField({ name: 'end_date' }))
    }
    if (!forestAreas.fields.getByName('is_active')) {
      forestAreas.fields.add(new BoolField({ name: 'is_active' }))
    }

    forestAreas.addIndex('idx_forest_areas_supplier_active', false, 'supplier, is_active', '')

    app.save(forestAreas)
  },
  (app) => {
    const forestAreas = app.findCollectionByNameOrId('forest_areas')
    forestAreas.fields.removeByName('supplier')
    forestAreas.fields.removeByName('start_date')
    forestAreas.fields.removeByName('end_date')
    forestAreas.fields.removeByName('is_active')
    forestAreas.removeIndex('idx_forest_areas_supplier_active')
    app.save(forestAreas)
  },
)
