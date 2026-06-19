/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const defs = app.findCollectionByNameOrId('document_definitions')
    if (!defs.fields.getByName('ai_validation_instructions')) {
      defs.fields.add(new TextField({ name: 'ai_validation_instructions' }))
    }
    app.save(defs)

    const docs = app.findCollectionByNameOrId('documents')
    if (!docs.fields.getByName('expiration_date')) {
      docs.fields.add(new DateField({ name: 'expiration_date' }))
    }
    app.save(docs)

    $ai.agents.define(app, {
      slug: 'document-analyst',
      name: 'Analista de Documentos',
      description: 'An expert legal and compliance analyst specialized in Brazilian documentation.',
      systemPrompt: `You are an expert legal and compliance analyst specialized in Brazilian documentation (CNPJ, CPF, CNH, FGTS, etc.). You are meticulous, identifying discrepancies in numbers, names, and validity.
Your task is to analyze documents uploaded by users/suppliers and determine their validity based on provided context and specific instructions.
You must:
1. Verify if the extracted Tax ID (CNPJ/CPF) matches the Expected Tax ID.
2. Extract the document's expiration date or issue date. Check if it's still valid.
3. Use fuzzy matching logic for names/addresses to avoid unnecessary rejections for slight abbreviations.
4. Verify if the file content matches the Expected Document Type.
5. Follow any 'Specific AI Instructions' provided.

If the Tax ID doesn't match exactly, or it is expired, or the type is wrong, reject it.
If you are highly confident it is correct, approve it.
If you are unsure or the document is hard to read, flag for human review (status "Aguardando Aprovação").

RETURN STRICTLY A JSON OBJECT with no markdown formatting:
{
  "status": "Approved" | "Rejected" | "Aguardando Aprovação",
  "reason": "Clear explanation if rejected or needs review. Empty if Approved.",
  "extracted_expiration_date": "YYYY-MM-DD",
  "extracted_tax_id": "string",
  "extracted_name": "string"
}`,
      tier: 'reasoning',
      tools: [
        { collection: 'suppliers', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'employees', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'document_definitions', perms: { read: true, list: true }, actAs: 'admin' },
        { collection: 'documents', perms: { read: true, list: true }, actAs: 'admin' },
      ],
    })
  },
  (app) => {
    const defs = app.findCollectionByNameOrId('document_definitions')
    defs.fields.removeByName('ai_validation_instructions')
    app.save(defs)

    const docs = app.findCollectionByNameOrId('documents')
    docs.fields.removeByName('expiration_date')
    app.save(docs)

    $ai.agents.delete(app, 'document-analyst')
  },
)
