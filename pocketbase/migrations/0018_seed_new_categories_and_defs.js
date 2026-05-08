migrate(
  (app) => {
    const categories = app.findCollectionByNameOrId('document_categories')
    const defs = app.findCollectionByNameOrId('document_definitions')

    const catsToSeed = [
      { name: 'VEÍCULOS' },
      { name: 'CONTRATADOS' },
      { name: 'FORNECEDOR' },
      { name: 'FUNCIONÁRIOS' },
      { name: 'FLORESTAS' },
    ]

    let funcCatId = null

    catsToSeed.forEach((cat) => {
      let exists = false
      let foundId = null

      // Check uppercase name
      try {
        const existing = app.findFirstRecordByData('document_categories', 'name', cat.name)
        exists = true
        foundId = existing.id
      } catch (_) {}

      // Check title case name if uppercase not found
      if (!exists) {
        try {
          const titleCaseName = cat.name.charAt(0) + cat.name.slice(1).toLowerCase()
          const existingLower = app.findFirstRecordByData(
            'document_categories',
            'name',
            titleCaseName,
          )
          exists = true
          foundId = existingLower.id
        } catch (_) {}
      }

      if (!exists) {
        const record = new Record(categories)
        record.set('name', cat.name)
        app.save(record)
        foundId = record.id
      }

      if (cat.name === 'FUNCIONÁRIOS') {
        funcCatId = foundId
      }
    })

    const defsToSeed = [
      { name: 'CNH', target_role: 'motorista', is_mandatory: true },
      { name: 'Carga Indivisível', target_role: 'motorista', is_mandatory: true },
      { name: 'Exame Toxicológico', target_role: 'motorista', is_mandatory: true },
      { name: 'Curso de Operador', target_role: 'operador', is_mandatory: true },
      { name: 'Curso de Motosserra', target_role: 'operador', is_mandatory: true },
    ]

    if (funcCatId) {
      defsToSeed.forEach((def) => {
        try {
          app.findFirstRecordByData('document_definitions', 'name', def.name)
        } catch (_) {
          const record = new Record(defs)
          record.set('name', def.name)
          record.set('category', funcCatId)
          record.set('target_role', def.target_role)
          record.set('is_mandatory', def.is_mandatory)
          record.set('target_person_type', 'Both')
          app.save(record)
        }
      })
    }
  },
  (app) => {
    // Down migration
  },
)
