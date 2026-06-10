/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'legal-document-analyst',
      name: 'Analista Jurídico de Documentos',
      description: 'Analista jurídico especializado em compliance e verificação de documentos.',
      systemPrompt:
        'Você é um analista jurídico especializado em compliance e verificação de documentos brasileiros. Quando solicitado a analisar um documento de uma coleção, use suas ferramentas para ler o registro e extrair os dados do arquivo associado. Você usará capacidades de visão para extrair texto de imagens ou PDFs escaneados. Responda sempre seguindo estritamente as instruções e fornecendo exclusivamente o formato JSON solicitado, sem formatação markdown.',
      tier: 'reasoning',
      tools: [{ collection: 'documents', perms: { read: true, list: true }, actAs: 'admin' }],
    })
  },
  (app) => {
    $ai.agents.deleteTools(app, 'legal-document-analyst', ['documents'])
  },
)
