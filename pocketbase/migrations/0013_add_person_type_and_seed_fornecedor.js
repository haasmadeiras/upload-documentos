migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('users')

    if (!users.fields.getByName('person_type')) {
      users.fields.add(
        new SelectField({
          name: 'person_type',
          values: ['PF', 'PJ'],
          maxSelect: 1,
        }),
      )
    }

    if (!users.fields.getByName('tax_id')) {
      users.fields.add(
        new TextField({
          name: 'tax_id',
        }),
      )
    }
    app.save(users)

    const docDefs = app.findCollectionByNameOrId('document_definitions')
    if (!docDefs.fields.getByName('target_person_type')) {
      docDefs.fields.add(
        new SelectField({
          name: 'target_person_type',
          values: ['PF', 'PJ', 'Both'],
          maxSelect: 1,
        }),
      )
    }
    app.save(docDefs)

    const categories = app.findCollectionByNameOrId('document_categories')
    let fornecedorCat
    try {
      fornecedorCat = app.findFirstRecordByData('document_categories', 'name', 'Fornecedor')
    } catch (_) {
      fornecedorCat = new Record(categories)
      fornecedorCat.set('name', 'Fornecedor')
      app.save(fornecedorCat)
    }

    const catId = fornecedorCat.id

    const defsToSeed = [
      // PF
      { name: 'Documento pessoal (CNH ou Identidade)', target: 'PF', val: 0 },
      { name: 'Comprovante de residência', target: 'PF', val: 0 },
      { name: 'CAEPF - Cadastro de Atividade Econômica de Pessoa Física', target: 'PF', val: 0 },
      { name: 'CND IBAMA', target: 'PF', val: 90 },
      { name: 'CND embargo IBAMA', target: 'PF', val: 120 },
      { name: 'CND Federal', target: 'PF', val: 90 },
      { name: 'CND Estadual', target: 'PF', val: 90 },
      { name: 'CND FGTS', target: 'PF', val: 90 },
      { name: 'CND Trabalhista', target: 'PF', val: 90 },
      { name: 'PGR - Programa de Gerenciamento de Riscos', target: 'PF', val: 0 },
      { name: 'PCMSO - Programa de Controle Médico de Saúde Ocupacional', target: 'PF', val: 0 },
      { name: 'LTCAT - Laudo Técnico das Condições Ambientais de Trabalho', target: 'PF', val: 0 },
      { name: 'Apólice do seguro vida global', target: 'PF', val: 0 },
      { name: 'Relatório da guia digital FGTS', target: 'PF', val: 90 },
      { name: 'Guia do INSS', target: 'PF', val: 90 },
      { name: 'Folha de pagamento mensal', target: 'PF', val: 90 },
      { name: 'Outro (citar)', target: 'PF', val: 0 },
      // PJ
      { name: 'Contrato Social', target: 'PJ', val: 0 },
      { name: 'Cartão CNPJ', target: 'PJ', val: 0 },
      { name: 'CND IBAMA', target: 'PJ', val: 90 },
      { name: 'CND embargo IBAMA', target: 'PJ', val: 90 },
      { name: 'CND FGTS', target: 'PJ', val: 90 },
      { name: 'CND Federal', target: 'PJ', val: 90 },
      { name: 'CND Estadual', target: 'PJ', val: 90 },
      { name: 'CND Trabalhista', target: 'PJ', val: 90 },
      { name: 'PGR - Programa de Gerenciamento de Riscos', target: 'PJ', val: 90 },
      { name: 'PCMSO - Programa de Controle Médico de Saúde Ocupacional', target: 'PJ', val: 90 },
      { name: 'LTCAT - Laudo Técnico das Condições Ambientais de Trabalho', target: 'PJ', val: 90 },
      { name: 'Apólice do seguro vida global', target: 'PJ', val: 90 },
      { name: 'Relatório da guia digital FGTS', target: 'PJ', val: 90 },
      { name: 'Guia do INSS', target: 'PJ', val: 90 },
      { name: 'Folha de pagamento mensal', target: 'PJ', val: 90 },
      { name: 'Outro (citar)', target: 'PJ', val: 0 },
    ]

    for (const def of defsToSeed) {
      try {
        app.findFirstRecordByFilter(
          'document_definitions',
          'name={:name} && category={:cat} && target_person_type={:target}',
          { name: def.name, cat: catId, target: def.target },
        )
      } catch (_) {
        const record = new Record(docDefs)
        record.set('category', catId)
        record.set('name', def.name)
        record.set('is_mandatory', true)
        record.set('validity_days', def.val)
        record.set('target_person_type', def.target)
        record.set('allowed_formats', 'pdf, jpg, png')
        app.save(record)
      }
    }
  },
  (app) => {
    const docDefs = app.findCollectionByNameOrId('document_definitions')
    docDefs.fields.removeByName('target_person_type')
    app.save(docDefs)

    const users = app.findCollectionByNameOrId('users')
    users.fields.removeByName('person_type')
    users.fields.removeByName('tax_id')
    app.save(users)
  },
)
