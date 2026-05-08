migrate(
  (app) => {
    const categories = ['Fornecedor', 'Funcionários', 'Veículos', 'Contratados', 'Florestas']
    const col = app.findCollectionByNameOrId('document_categories')

    for (const name of categories) {
      try {
        app.findFirstRecordByData('document_categories', 'name', name)
      } catch (_) {
        const record = new Record(col)
        record.set('name', name)
        app.save(record)
      }
    }
  },
  (app) => {
    const categories = ['Fornecedor', 'Funcionários', 'Veículos', 'Contratados', 'Florestas']
    for (const name of categories) {
      try {
        const record = app.findFirstRecordByData('document_categories', 'name', name)
        app.delete(record)
      } catch (_) {}
    }
  },
)
