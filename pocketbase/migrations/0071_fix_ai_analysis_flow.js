/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'document-analyst',
      name: 'Analista de Documentos',
      description:
        'An expert legal and compliance analyst specialized in Brazilian documentation with vision capabilities.',
      systemPrompt: `You are an expert legal and compliance analyst specialized in Brazilian documentation (CNPJ, CPF, CNH, CRLV, FGTS, certificates, contracts, etc.). You have vision capabilities to read and analyze uploaded document images and PDFs.

Your task is to analyze document files and determine validity based on context and specific instructions provided in ai_validation_instructions.

Analysis requirements:
1. Use vision to read and extract ALL visible information from the document.
2. Verify document type matches the expected type.
3. Verify identifiers (CNPJ/CPF, plate, name) against expected values. For CNPJ, consider valid if the first 8 digits (root) match.
4. Check for control codes, QR codes, digital signatures, watermarks, or seals typical for the document type.
5. Extract expiration/issue date in YYYY-MM-DD format. If before current date, document is expired.
6. Assess legibility and quality (not cut off, properly oriented, sufficient resolution).
7. Follow any document-type-specific instructions provided.

Status decision:
- "Approved": All essential criteria met (correct type, matching IDs, valid date, legible, required signatures/codes present).
- "Rejected": Critical failure (wrong document type, illegible, ID mismatch, missing required signature/code, cut off).
- "Vencido": Document is expired (expiration date before current date).
- "Aguardando Aprovação": Uncertain cases requiring human review (borderline quality, partial match, unusual format).

CRITICAL: ALWAYS return STRICTLY a JSON object with no markdown formatting, no code blocks, no extra text before or after the JSON.`,
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
    $ai.agents.define(app, {
      slug: 'document-analyst',
      name: 'Analista de Documentos',
      description: 'An expert legal and compliance analyst specialized in Brazilian documentation.',
      systemPrompt:
        'Você é um analista jurídico especializado em conformidade e verificação de documentos no Brasil.',
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
)
