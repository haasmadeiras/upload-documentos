/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    if (!docs.fields.getByName('rejection_reason')) {
      docs.fields.add(new TextField({ name: 'rejection_reason' }))
    }
    if (!docs.fields.getByName('analysis_log')) {
      docs.fields.add(new JSONField({ name: 'analysis_log' }))
    }
    app.save(docs)

    $ai.agents.define(app, {
      slug: 'legal-document-reviewer',
      name: 'Revisor Jurídico',
      description: 'Brazilian legal assistant specialized in corporate compliance.',
      systemPrompt:
        'Você é um assistente jurídico brasileiro profissional especializado em compliance corporativo. Você deve analisar os dados do documento fornecido (acessado através da URL) e extrair informações estritamente no formato JSON.\n\nVerifique:\n1. O documento é um \'Comprovante de Inscrição e de Situação Cadastral\' (Cartão CNPJ) válido?\n2. Qual é o número do CNPJ listado? (Retorne apenas os dígitos)\n3. Qual é a \'Data de Emissão\'? (Retorne no formato YYYY-MM-DD)\n\nResponda ESTRITAMENTE com um objeto JSON válido (sem blocos de código markdown) neste formato exato:\n{\n  "isCnpjCard": true,\n  "cnpj": "string",\n  "emissionDate": "YYYY-MM-DD"\n}',
      tier: 'fast',
    })
  },
  (app) => {
    const docs = app.findCollectionByNameOrId('documents')
    docs.fields.removeByName('rejection_reason')
    docs.fields.removeByName('analysis_log')
    app.save(docs)

    $ai.agents.delete(app, 'legal-document-reviewer')
  },
)
