migrate(
  (app) => {
    // Map old statuses to new valid ones
    app
      .db()
      .newQuery(
        "UPDATE documents SET status = 'Solicitar Correção' WHERE status = 'Correction Required'",
      )
      .execute()
    app
      .db()
      .newQuery(
        "UPDATE documents SET status = 'Pending' WHERE status NOT IN ('Pending', 'Approved', 'Rejected', 'Solicitar Correção', 'Vencido')",
      )
      .execute()

    const col = app.findCollectionByNameOrId('documents')
    col.fields.removeByName('status')
    col.fields.add(
      new SelectField({
        name: 'status',
        required: true,
        values: ['Pending', 'Approved', 'Rejected', 'Solicitar Correção', 'Vencido'],
      }),
    )
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    col.fields.removeByName('status')
    col.fields.add(
      new SelectField({
        name: 'status',
        required: true,
        values: [
          'Pending',
          'Under Analysis',
          'Pending Final Approval',
          'Approved',
          'Rejected',
          'Correction Required',
          'Vencido',
        ],
      }),
    )
    app.save(col)
  },
)
