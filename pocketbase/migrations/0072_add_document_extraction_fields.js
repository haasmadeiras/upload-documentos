/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    if (!docs.fields.getByName('extracted_text')) {
      docs.fields.add(new TextField({ name: 'extracted_text' }))
    }
    if (!docs.fields.getByName('extraction_method')) {
      docs.fields.add(
        new SelectField({ name: 'extraction_method', values: ['text', 'image'], maxSelect: 1 }),
      )
    }
    app.save(docs)
  },
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    docs.fields.removeByName('extracted_text')
    docs.fields.removeByName('extraction_method')
    app.save(docs)
  },
)
