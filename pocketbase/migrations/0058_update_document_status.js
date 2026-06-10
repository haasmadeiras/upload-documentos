migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const field = col.fields.getByName('status')
    field.values = ['Pending', 'Pending Final Approval', 'Approved', 'Rejected']
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const field = col.fields.getByName('status')
    field.values = ['Pending', 'Approved', 'Rejected']
    app.save(col)
  },
)
