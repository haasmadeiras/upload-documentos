migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const statusField = col.fields.getByName('status')
    const values = statusField.values
    const index = values.indexOf('Solicitar Correção')
    if (index !== -1) {
      values[index] = 'Aguardando Aprovação'
    } else if (!values.includes('Aguardando Aprovação')) {
      values.push('Aguardando Aprovação')
    }
    statusField.values = values
    app.save(col)

    app
      .db()
      .newQuery(
        `UPDATE documents SET status = 'Aguardando Aprovação' WHERE status = 'Solicitar Correção'`,
      )
      .execute()
  },
  (app) => {
    const col = app.findCollectionByNameOrId('documents')
    const statusField = col.fields.getByName('status')
    const values = statusField.values
    const index = values.indexOf('Aguardando Aprovação')
    if (index !== -1) {
      values[index] = 'Solicitar Correção'
    }
    statusField.values = values
    app.save(col)

    app
      .db()
      .newQuery(
        `UPDATE documents SET status = 'Solicitar Correção' WHERE status = 'Aguardando Aprovação'`,
      )
      .execute()
  },
)
