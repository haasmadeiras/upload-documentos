migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const field = col.fields.getByName('status')
    field.selectValues = [
      'Pending',
      'Under Analysis',
      'Pending Final Approval',
      'Approved',
      'Rejected',
      'Correction Required',
    ]
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const field = col.fields.getByName('status')
    field.selectValues = ['Pending', 'Pending Final Approval', 'Approved', 'Rejected']
    app.save(col)
  },
)
