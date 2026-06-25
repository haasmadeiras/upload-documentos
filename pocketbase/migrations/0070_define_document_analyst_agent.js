/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'document-analyst',
      name: 'Analista de Documentos',
      description: 'An expert legal and compliance analyst specialized in Brazilian documentation.',
      systemPrompt:
        'Você é um analista jurídico especializado em conformidade e verificação de documentos no Brasil. Você usa suas ferramentas para buscar os documentos anexados e realizar validações cruzadas. Sempre valide dados do fornecedor, do colaborador ou do veículo de acordo com as instruções. Verifique a legibilidade, presença de assinaturas (se necessárias) e se o documento não está vencido.',
      tier: 'reasoning',
      tools: [
        { collection: 'documents', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'document_definitions', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'suppliers', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'employees', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'vehicles', perms: { read: true, list: true }, actAs: 'admin' },
      ],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'document-analyst')
  },
)
