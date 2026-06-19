migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('document_definitions')
    if (!col.fields.getByName('max_size_mb')) {
      col.fields.add(new NumberField({ name: 'max_size_mb', min: 1 }))
      app.save(col)
    }

    app
      .db()
      .newQuery(
        'UPDATE document_definitions SET max_size_mb = 20 WHERE max_size_mb IS NULL OR max_size_mb = 0',
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('document_definitions')
    if (col.fields.getByName('max_size_mb')) {
      col.fields.removeByName('max_size_mb')
      app.save(col)
    }
  },
)
