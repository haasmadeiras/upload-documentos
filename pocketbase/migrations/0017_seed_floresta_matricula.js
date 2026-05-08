migrate(
  (app) => {
    const categoriesCol = app.findCollectionByNameOrId('document_categories')
    const defsCol = app.findCollectionByNameOrId('document_definitions')

    // Seed "Floresta" category
    let florestaCat
    try {
      florestaCat = app.findFirstRecordByData('document_categories', 'name', 'Floresta')
    } catch (_) {
      florestaCat = new Record(categoriesCol)
      florestaCat.set('name', 'Floresta')
      app.save(florestaCat)
    }

    // Seed "Matrícula" category
    let matriculaCat
    try {
      matriculaCat = app.findFirstRecordByData('document_categories', 'name', 'Matrícula')
    } catch (_) {
      matriculaCat = new Record(categoriesCol)
      matriculaCat.set('name', 'Matrícula')
      app.save(matriculaCat)
    }

    const florestaDefs = [
      { name: 'Inscrição Estadual', validity: null },
      { name: 'Cadastro Florestal', validity: null },
      { name: 'CND Débito IBAMA', validity: 90 },
      { name: 'CND Federal', validity: 90 },
      { name: 'CND Estadual', validity: 90 },
      { name: 'Fazer mapas de Sobreposição Ambiental', validity: null },
      { name: 'Localização da área (KML ou KMZ)', validity: null },
    ]

    for (const def of florestaDefs) {
      try {
        app.findFirstRecordByData('document_definitions', 'name', def.name)
      } catch (_) {
        const record = new Record(defsCol)
        record.set('category', florestaCat.id)
        record.set('name', def.name)
        record.set('is_mandatory', true)
        if (def.validity) {
          record.set('validity_days', def.validity)
        }
        app.save(record)
      }
    }

    const matriculaDefs = [
      { name: 'Matrícula atualizada 3 meses', validity: null },
      { name: 'CAR', validity: null },
      { name: 'CCIR - INCRA', validity: 365 },
      { name: 'CND ITR', validity: 365 },
    ]

    for (const def of matriculaDefs) {
      try {
        app.findFirstRecordByData('document_definitions', 'name', def.name)
      } catch (_) {
        const record = new Record(defsCol)
        record.set('category', matriculaCat.id)
        record.set('name', def.name)
        record.set('is_mandatory', true)
        if (def.validity) {
          record.set('validity_days', def.validity)
        }
        app.save(record)
      }
    }
  },
  (app) => {
    const defsToRemove = [
      'Inscrição Estadual',
      'Cadastro Florestal',
      'CND Débito IBAMA',
      'CND Federal',
      'CND Estadual',
      'Fazer mapas de Sobreposição Ambiental',
      'Localização da área (KML ou KMZ)',
      'Matrícula atualizada 3 meses',
      'CAR',
      'CCIR - INCRA',
      'CND ITR',
    ]

    for (const name of defsToRemove) {
      try {
        const record = app.findFirstRecordByData('document_definitions', 'name', name)
        app.delete(record)
      } catch (_) {}
    }

    const catsToRemove = ['Floresta', 'Matrícula']
    for (const name of catsToRemove) {
      try {
        const record = app.findFirstRecordByData('document_categories', 'name', name)
        app.delete(record)
      } catch (_) {}
    }
  },
)
