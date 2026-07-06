/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    const field = docs.fields.getByName('extracted_text')
    if (field) {
      field.max = 500000
      app.save(docs)
    }
  },
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    const field = docs.fields.getByName('extracted_text')
    if (field) {
      field.max = 5000
      app.save(docs)
    }
  },
)
