migrate(
  (app) => {
    const catNames = ['Funcionário', 'Motoristas', 'Operadores']
    const catCol = app.findCollectionByNameOrId('document_categories')
    const cats = {}

    catNames.forEach((name) => {
      try {
        const record = app.findFirstRecordByData('document_categories', 'name', name)
        cats[name] = record
      } catch (_) {
        const record = new Record(catCol)
        record.set('name', name)
        app.save(record)
        cats[name] = record
      }
    })

    const defCol = app.findCollectionByNameOrId('document_definitions')
    const defsToCreate = [
      {
        name: 'Ficha registro',
        cat: 'Funcionário',
        target_role: 'all',
        mandatory: false,
        validity: 0,
      },
      { name: 'ASO', cat: 'Funcionário', target_role: 'all', mandatory: true, validity: 0 },
      {
        name: 'Ficha de EPI',
        cat: 'Funcionário',
        target_role: 'all',
        mandatory: true,
        validity: 180,
      },
      {
        name: 'Recibo de pagamentos',
        cat: 'Funcionário',
        target_role: 'all',
        mandatory: true,
        validity: 90,
      },
      {
        name: 'CNH (se motorista)',
        cat: 'Motoristas',
        target_role: 'motorista',
        mandatory: true,
        validity: 0,
      },
      {
        name: 'Carga indivisível (se motorista)',
        cat: 'Motoristas',
        target_role: 'motorista',
        mandatory: true,
        validity: 730,
      },
      {
        name: 'Exame Toxicológico (se moto)',
        cat: 'Motoristas',
        target_role: 'motorista',
        mandatory: true,
        validity: 0,
      },
      {
        name: 'Curso operador',
        cat: 'Operadores',
        target_role: 'operador',
        mandatory: true,
        validity: 365,
      },
      {
        name: 'Curso motosserra (se aplicável)',
        cat: 'Operadores',
        target_role: 'operador',
        mandatory: true,
        validity: 365,
      },
    ]

    defsToCreate.forEach((d) => {
      try {
        app.findFirstRecordByData('document_definitions', 'name', d.name)
      } catch (_) {
        const record = new Record(defCol)
        record.set('name', d.name)
        record.set('category', cats[d.cat].id)
        record.set('is_mandatory', d.mandatory)
        record.set('validity_days', d.validity)
        record.set('target_role', d.target_role)
        app.save(record)
      }
    })
  },
  (app) => {
    // Can be left empty as this is seed data. To cleanly rollback, we would delete these specific definitions.
  },
)
