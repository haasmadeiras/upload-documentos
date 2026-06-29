onRecordAfterUpdateSuccess((e) => {
  const originalStatus = e.record.original().getString('status')
  const newStatus = e.record.getString('status')

  if (newStatus !== 'Pending') return e.next()
  if (originalStatus === 'Pending') return e.next()

  try {
    const docId = e.record.id
    const userId = e.record.getString('user')

    let contextText = ''
    try {
      if (e.record.getString('supplier')) {
        const supplier = $app.findRecordById('suppliers', e.record.getString('supplier'))
        const taxId = supplier.getString('tax_id')
        const name = supplier.getString('legal_name') || supplier.getString('name')
        contextText = `Entidade do Documento: Fornecedor (PJ/PF)\nCNPJ/CPF Esperado: ${taxId}\nNome/Razão Social Esperada: ${name}`
      } else if (e.record.getString('employee')) {
        const emp = $app.findRecordById('employees', e.record.getString('employee'))
        const taxId = emp.getString('tax_id')
        const name = emp.getString('name')
        contextText = `Entidade do Documento: Colaborador\nCPF Esperado: ${taxId}\nNome Esperado: ${name}`
      } else if (e.record.getString('vehicle')) {
        const veh = $app.findRecordById('vehicles', e.record.getString('vehicle'))
        const plate = veh.getString('plate')
        const model = veh.getString('model')
        contextText = `Entidade do Documento: Veículo\nPlaca Esperada: ${plate}\nModelo Esperado: ${model}`
      } else {
        const userRecord = $app.findRecordById('users', userId)
        const taxId = userRecord.getString('tax_id')
        const name = userRecord.getString('legal_name') || userRecord.getString('name')
        contextText = `Entidade do Documento: Usuário Geral\nCPF/CNPJ Esperado: ${taxId}\nNome Esperado: ${name}`
      }
    } catch (err) {
      console.log('Error fetching context:', err.message)
    }

    let defName = 'Documento'
    let defInstructions = ''
    try {
      if (e.record.getString('definition')) {
        const def = $app.findRecordById('document_definitions', e.record.getString('definition'))
        defName = def.getString('name')
        defInstructions = def.getString('ai_validation_instructions') || ''
      }
    } catch (err) {}

    let visionContent = null
    try {
      const pbUrl = $secrets.get('PB_INSTANCE_URL') || ''
      const pbToken = $secrets.get('PB_SUPERUSER_TOKEN') || ''
      const filename = e.record.getString('file')
      if (pbUrl && pbToken && filename) {
        const fileUrl = pbUrl + '/api/files/documents/' + docId + '/' + filename
        const fileRes = $http.send({
          url: fileUrl,
          method: 'GET',
          headers: { Authorization: pbToken },
          timeout: 30,
        })
        if (fileRes.statusCode === 200 && fileRes.body) {
          const ext = filename.split('.').pop().toLowerCase()
          let mimeType = 'application/octet-stream'
          if (ext === 'pdf') mimeType = 'application/pdf'
          else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg'
          else if (ext === 'png') mimeType = 'image/png'
          else if (ext === 'gif') mimeType = 'image/gif'
          else if (ext === 'webp') mimeType = 'image/webp'
          else if (ext === 'bmp') mimeType = 'image/bmp'

          let bytes = fileRes.body
          if (typeof bytes === 'string') {
            const tmp = []
            for (let i = 0; i < bytes.length; i++) tmp.push(bytes.charCodeAt(i) & 0xff)
            bytes = tmp
          }
          if (bytes && bytes.length && bytes.length < 10 * 1024 * 1024) {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
            let base64 = ''
            const len = bytes.length
            for (let i = 0; i < len; i += 3) {
              const b1 = bytes[i]
              const b2 = i + 1 < len ? bytes[i + 1] : 0
              const b3 = i + 2 < len ? bytes[i + 2] : 0
              base64 += chars[b1 >> 2]
              base64 += chars[((b1 & 3) << 4) | (b2 >> 4)]
              base64 += i + 1 < len ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '='
              base64 += i + 2 < len ? chars[b3 & 63] : '='
            }
            visionContent = {
              type: 'image_url',
              image_url: { url: 'data:' + mimeType + ';base64,' + base64 },
            }
          }
        }
      }
    } catch (fileErr) {
      console.log('Failed to fetch file for vision:', fileErr.message)
    }

    const systemPrompt = `You are an expert legal and compliance analyst specialized in Brazilian documentation (CNPJ, CPF, CNH, CRLV, FGTS, certificates, contracts, etc.). You have vision capabilities to read and analyze uploaded document images and PDFs.

Your task is to analyze the provided document file and determine its validity based on the context and specific instructions provided.

Analysis requirements:
1. Use vision to read and extract ALL visible information from the document.
2. Verify document type: Confirm the file corresponds to the "Tipo Esperado" (Expected Document Type).
3. Verify identifiers:
   - For Suppliers (PJ/PF): Extract CNPJ/CPF and compare with the expected value. For CNPJ, consider valid if the first 8 digits (root) match.
   - For Employees: Extract and compare CPF and Name.
   - For Vehicles: Extract and compare license plate and model.
4. Check authenticity: Look for control codes, QR codes, digital signatures, watermarks, or seals that are typical for the document type.
5. Check validity: Extract expiration/issue date in YYYY-MM-DD format. If the date is before the current date, the document is expired.
6. Assess quality: Verify the document is legible, not cut off, properly oriented, and has sufficient resolution.
7. Apply specific instructions: Follow any document-type-specific instructions provided.

Status decision rules:
- "Approved": All essential criteria met (correct type, matching IDs, valid date, legible, required signatures/codes present).
- "Rejected": Critical failure (wrong document type, illegible, ID mismatch, missing required signature/code, cut off).
- "Vencido": Document is expired (expiration date before current date).
- "Aguardando Aprovação": Uncertain cases requiring human review (borderline quality, partial match, unusual format).

Return STRICTLY a JSON object with no markdown formatting.`

    const promptMessage = `Analise o documento enviado.
ID do Documento: ${docId}
Tipo Esperado: ${defName}

Instruções Específicas:
${defInstructions || 'Nenhuma instrução adicional.'}

${contextText}

Data Atual (Referência): ${new Date().toISOString().split('T')[0]}

Instruções da Análise:
1. ${visionContent ? 'Examine o arquivo de imagem/PDF fornecido abaixo.' : 'Acesse o arquivo associado ao registro de documento com ID ' + docId + '.'} Use visão para ler todo o conteúdo visível.
2. Legibilidade/Qualidade: Se o arquivo estiver ilegível, muito cortado, com resolução ruim ou orientação que impeça a leitura total, classifique como 'Rejected' imediatamente.
3. Correspondência de Tipo: Verifique se o arquivo realmente é do 'Tipo Esperado'.
4. Identificadores: 
   - Se Fornecedor/PJ: Extraia o CNPJ e compare. Considere válido se os primeiros 8 dígitos (raiz) baterem. 
   - Se Colaborador: Compare CPF/Nome.
   - Se Veículo: Extraia e compare a Placa (ou Chassi).
5. Autenticidade: Verifique se possui código de controle (control code), QR Code ou assinaturas caso seja comum para o tipo (ex: CND, contratos). 
6. Validade: Extraia a data de vencimento/validade no formato YYYY-MM-DD. Se a data for anterior à 'Data Atual', o status DEVE ser 'Vencido' e 'is_expired' = true.
7. Regra Final de Decisão: Retorne 'Approved' se todos os critérios essenciais estiverem atendidos; 'Rejected' se algo crítico falhar (ex. documento diferente, ilegível, divergência de CNPJ raiz); 'Vencido' se expirado; 'Aguardando Aprovação' em casos duvidosos ou que dependam de revisão humana.

RETORNE EXCLUSIVAMENTE UM JSON DE ACORDO COM O SCHEMA ESTABELECIDO, SEM CRASES DE MARKDOWN.`

    const jsonSchema = {
      type: 'json_schema',
      json_schema: {
        name: 'document_analysis',
        strict: true,
        schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['Approved', 'Rejected', 'Aguardando Aprovação', 'Vencido'],
            },
            rejection_reason: { type: 'string' },
            explanation: { type: 'string' },
            extracted_expiration_date: {
              type: 'string',
              description: 'YYYY-MM-DD ou string vazia',
            },
            is_expired: { type: 'boolean' },
            extracted_tax_id: { type: 'string', description: 'CNPJ/CPF extraído ou string vazia' },
            extracted_name: {
              type: 'string',
              description: 'Nome/Razão Social extraída ou string vazia',
            },
            extracted_plate: { type: 'string', description: 'Placa extraída ou string vazia' },
            control_code: {
              type: 'string',
              description: 'Código de validação, autenticação ou string vazia',
            },
            has_signature: { type: 'boolean' },
            is_legible: { type: 'boolean' },
            match_confidence: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          },
          required: [
            'status',
            'rejection_reason',
            'explanation',
            'extracted_expiration_date',
            'is_expired',
            'extracted_tax_id',
            'extracted_name',
            'extracted_plate',
            'control_code',
            'has_signature',
            'is_legible',
            'match_confidence',
          ],
          additionalProperties: false,
        },
      },
    }

    let analysisResult = null
    let rawContent = ''
    let attempts = 0
    let lastError = null

    while (attempts < 2 && !analysisResult) {
      attempts++
      try {
        const retryMsg = `Retorne APENAS um JSON válido estrito. Erro anterior: ${lastError ? lastError.message : 'desconhecido'}`
        const userContent = visionContent
          ? [{ type: 'text', text: attempts === 1 ? promptMessage : retryMsg }, visionContent]
          : attempts === 1
            ? promptMessage
            : retryMsg

        const chatParams = {
          model: 'fast',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }
        if (attempts === 1) chatParams.response_format = jsonSchema

        const result = $ai.chat(chatParams)
        if (!result || !result.choices || !result.choices[0] || !result.choices[0].message) {
          throw new Error('Invalid AI response structure')
        }
        rawContent = result.choices[0].message.content

        let jsonStr = rawContent.trim()
        if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
        }
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonMatch) jsonStr = jsonMatch[0]
        analysisResult = JSON.parse(jsonStr)

        if (
          !['Approved', 'Rejected', 'Aguardando Aprovação', 'Vencido'].includes(
            analysisResult.status,
          )
        ) {
          analysisResult.status = 'Aguardando Aprovação'
        }
      } catch (err) {
        lastError = err
        console.log(`Tentativa ${attempts} falhou ao parsear JSON:`, err.message, rawContent)
      }
    }

    if (!analysisResult) {
      analysisResult = {
        status: 'Aguardando Aprovação',
        rejection_reason: 'Falha ao processar resposta da IA. Revisão manual necessária.',
        explanation: 'Falha no parser do JSON.',
        extracted_expiration_date: '',
        is_expired: false,
        extracted_tax_id: '',
        extracted_name: '',
        extracted_plate: '',
        control_code: '',
        has_signature: false,
        is_legible: true,
        match_confidence: 'Low',
      }
    }

    const docRecord = $app.findRecordById('documents', docId)
    docRecord.set('analysis_log', analysisResult)

    if (analysisResult.status === 'Approved') {
      docRecord.set('status', 'Approved')
      docRecord.set('rejection_reason', '')
    } else if (analysisResult.status === 'Rejected') {
      docRecord.set('status', 'Rejected')
      docRecord.set(
        'rejection_reason',
        analysisResult.rejection_reason ||
          analysisResult.explanation ||
          'Documento inválido ou ilegível.',
      )
    } else if (analysisResult.status === 'Vencido' || analysisResult.is_expired) {
      docRecord.set('status', 'Vencido')
      docRecord.set(
        'rejection_reason',
        analysisResult.rejection_reason || analysisResult.explanation || 'Documento vencido.',
      )
    } else {
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set(
        'rejection_reason',
        analysisResult.rejection_reason ||
          analysisResult.explanation ||
          'Necessita de revisão humana.',
      )
    }

    if (
      analysisResult.extracted_expiration_date &&
      analysisResult.extracted_expiration_date.includes('-')
    ) {
      try {
        const expDate = Date.parse(analysisResult.extracted_expiration_date)
        if (!isNaN(expDate)) {
          docRecord.set(
            'expiration_date',
            analysisResult.extracted_expiration_date + ' 12:00:00.000Z',
          )
          if (expDate < Date.now()) {
            docRecord.set('status', 'Vencido')
            docRecord.set(
              'rejection_reason',
              'O documento está vencido de acordo com a data extraída.',
            )
          }
        }
      } catch (e) {}
    }

    $app.save(docRecord)
  } catch (err) {
    console.log('Failed to trigger AI analyst:', err.message)
    try {
      const docRecord = $app.findRecordById('documents', e.record.id)
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set(
        'rejection_reason',
        'Erro interno na análise automática. Será analisado manualmente.',
      )
      docRecord.set('analysis_log', { error: err.message })
      $app.save(docRecord)
    } catch (saveErr) {}
  }

  return e.next()
}, 'documents')
