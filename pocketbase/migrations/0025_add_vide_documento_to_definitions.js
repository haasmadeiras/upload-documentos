migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('document_definitions')
    if (!col.fields.getByName('is_vide_documento')) {
      col.fields.add(new BoolField({ name: 'is_vide_documento' }))
    }
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('document_definitions')
    col.fields.removeByName('is_vide_documento')
    app.save(col)
  },
)
