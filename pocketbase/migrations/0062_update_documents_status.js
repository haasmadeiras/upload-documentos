migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const field = col.fields.getByName('status')
    field.values = ['Pending', 'Approved', 'Rejected', 'Solicitar Correção', 'Vencido']
    app.save(col)

    // Update existing data to standard
    app
      .db()
      .newQuery(
        "UPDATE documents SET status = 'Pending' WHERE status = 'Pending Final Approval' OR status = 'Em Análise'",
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const field = col.fields.getByName('status')
    field.values = [
      'Pending',
      'Pending Final Approval',
      'Em Análise',
      'Approved',
      'Rejected',
      'Solicitar Correção',
      'Vencido',
    ]
    app.save(col)
  },
)
