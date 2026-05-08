migrate(
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    if (!docs.fields.getByName('employee')) {
      docs.fields.add(
        new RelationField({
          name: 'employee',
          collectionId: app.findCollectionByNameOrId('employees').id,
          maxSelect: 1,
          cascadeDelete: true,
        }),
      )
      app.save(docs)
    }

    const defs = app.findCollectionByNameOrId('document_definitions')
    if (!defs.fields.getByName('target_role')) {
      defs.fields.add(
        new SelectField({
          name: 'target_role',
          values: ['all', 'motorista', 'operador', 'outros'],
          maxSelect: 1,
        }),
      )
      app.save(defs)
    }
  },
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    docs.fields.removeByName('employee')
    app.save(docs)

    const defs = app.findCollectionByNameOrId('document_definitions')
    defs.fields.removeByName('target_role')
    app.save(defs)
  },
)
