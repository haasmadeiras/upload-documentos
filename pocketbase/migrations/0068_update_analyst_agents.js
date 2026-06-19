/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'legal-document-analyst',
      name: 'Analista Jurídico de Documentos',
      description: 'Analista jurídico especializado em compliance e verificação de documentos.',
      systemPrompt:
        'Você é um analista jurídico especializado em compliance e verificação de documentos brasileiros. Quando solicitado a analisar um documento de uma coleção, use suas ferramentas para ler o registro e extrair os dados do arquivo associado. Você usará capacidades de visão para extrair texto de imagens ou PDFs escaneados. Responda sempre seguindo estritamente as instruções e fornecendo exclusivamente o formato JSON solicitado, sem formatação markdown. Em caso de rejeição, você deve incluir um campo obrigatório "rejection_reason" na resposta estruturada JSON explicando o motivo de forma clara e concisa em português.',
      tier: 'reasoning',
      tools: [{ collection: 'documents', perms: { read: true, list: true }, actAs: 'admin' }],
    })

    $ai.agents.define(app, {
      slug: 'document-analyst',
      name: 'Analista de Documentos',
      description: 'An expert legal and compliance analyst specialized in Brazilian documentation.',
      systemPrompt:
        'Você é um analista jurídico especializado em compliance e verificação de documentos brasileiros. Extraia os dados e verifique inconsistências. Em caso de rejeição (Rejected ou Vencido), forneça um campo "rejection_reason" obrigatório na sua saída estruturada JSON, contendo o motivo detalhado em português.',
      tier: 'fast',
      tools: [{ collection: 'documents', perms: { read: true, list: true }, actAs: 'admin' }],
    })
  },
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
)
