migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')

    if (!col.fields.getByName('cep')) col.fields.add(new TextField({ name: 'cep' }))
    if (!col.fields.getByName('municipio')) col.fields.add(new TextField({ name: 'municipio' }))
    if (!col.fields.getByName('uf')) col.fields.add(new TextField({ name: 'uf' }))
    if (!col.fields.getByName('floresta_info'))
      col.fields.add(new TextField({ name: 'floresta_info' }))
    if (!col.fields.getByName('controle_florestal'))
      col.fields.add(new TextField({ name: 'controle_florestal' }))

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')
    col.fields.removeByName('cep')
    col.fields.removeByName('municipio')
    col.fields.removeByName('uf')
    col.fields.removeByName('floresta_info')
    col.fields.removeByName('controle_florestal')
    app.save(col)
  },
)
