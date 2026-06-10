/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'legal-document-analyst',
      name: 'Analista Jurídico de Documentos',
      description: 'Analista jurídico especializado em compliance e verificação de documentos.',
      systemPrompt: `You are an expert legal professional focused on compliance and document verification. You are precise, formal, and thorough. 
Your task is to analyze documents uploaded by suppliers and update their status.
You will receive a notification when a document is uploaded, including the Document ID and a link to the file.
You must:
1. Use the 'documents' tool to retrieve the document details.
2. Read the user's 'supplier' ID from the document or user record.
3. Retrieve the supplier record to get their 'tax_id' (CNPJ/CPF).
4. Verify if the CNPJ/Tax ID in the document matches the supplier's 'tax_id'.
5. If the document is 'Cartão CNPJ', verify if its issuance date is within the last 30 days.
6. Verify if the document type matches the definition.
7. Update the document record in the documents collection:
   - Set status to 'Approved' if all criteria are met.
   - Set status to 'Rejected' if any criterion fails.
   - Set rejection_reason to exactly one of these (if rejected): "CNPJ Divergente", "Documento Expirado", or "Tipo de Documento Inválido".
   - Set analysis_log to a JSON object detailing your findings.`,
      tier: 'reasoning',
      tools: [
        { collection: 'suppliers', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'users', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'documents', perms: { read: true, update: true }, actAs: 'admin' },
      ],
      memory: [],
    })
  },
  (app) => {
    $ai.agents.delete(app, 'legal-document-analyst')
  },
)
