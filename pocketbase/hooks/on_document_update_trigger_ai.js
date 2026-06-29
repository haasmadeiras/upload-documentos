onRecordAfterUpdateSuccess((e) => {
  var originalStatus = e.record.original().getString('status')
  var newStatus = e.record.getString('status')
  if (newStatus !== 'Pending') return e.next()
  if (originalStatus === 'Pending') return e.next()

  function cleanJsonResponse(raw) {
    var str = (raw || '').trim()
    str = str.replace(/```json\s*/gi, '').replace(/```\s*/gi, '')
    str = str.replace(/```/gi, '')
    var firstBrace = str.indexOf('{')
    var lastBrace = str.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      str = str.substring(firstBrace, lastBrace + 1)
    }
    return str.trim()
  }

  function buildContext() {
    var ctx = {
      type: 'Unknown',
      expectedTaxId: '',
      expectedName: '',
      expectedPlate: '',
      expectedModel: '',
    }
    try {
      var supplierId = e.record.getString('supplier')
      var employeeId = e.record.getString('employee')
      var vehicleId = e.record.getString('vehicle')
      var userId = e.record.getString('user')
      if (supplierId) {
        var s = $app.findRecordById('suppliers', supplierId)
        ctx.type = 'Fornecedor'
        ctx.expectedTaxId = s.getString('tax_id')
        ctx.expectedName = s.getString('legal_name') || s.getString('name')
      } else if (employeeId) {
        var emp = $app.findRecordById('employees', employeeId)
        ctx.type = 'Colaborador'
        ctx.expectedTaxId = emp.getString('tax_id')
        ctx.expectedName = emp.getString('name')
      } else if (vehicleId) {
        var v = $app.findRecordById('vehicles', vehicleId)
        ctx.type = 'Veiculo'
        ctx.expectedPlate = v.getString('plate')
        ctx.expectedModel = v.getString('model')
      } else if (userId) {
        var u = $app.findRecordById('users', userId)
        ctx.type = 'Usuario'
        ctx.expectedTaxId = u.getString('tax_id')
        ctx.expectedName = u.getString('legal_name') || u.getString('name')
      }
    } catch (err) {
      console.log('Context error:', err.message)
    }
    return ctx
  }

  function buildVisionContent(docId) {
    try {
      var pbUrl = $secrets.get('PB_INSTANCE_URL') || ''
      var pbToken = $secrets.get('PB_SUPERUSER_TOKEN') || ''
      var filename = e.record.getString('file')
      if (!pbUrl || !pbToken || !filename) return null
      var fileUrl = pbUrl + '/api/files/documents/' + docId + '/' + filename
      var fileRes = $http.send({
        url: fileUrl,
        method: 'GET',
        headers: { Authorization: pbToken },
        timeout: 30,
      })
      if (fileRes.statusCode !== 200 || !fileRes.body) return null
      var ext = filename.split('.').pop().toLowerCase()
      var mimeMap = {
        pdf: 'application/pdf',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        bmp: 'image/bmp',
      }
      var mimeType = mimeMap[ext] || 'application/octet-stream'
      var bytes = fileRes.body
      if (typeof bytes === 'string') {
        var tmp = []
        for (var i = 0; i < bytes.length; i++) tmp.push(bytes.charCodeAt(i) & 0xff)
        bytes = tmp
      }
      if (!bytes || !bytes.length || bytes.length >= 10 * 1024 * 1024) return null
      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var base64 = ''
      for (var i = 0; i < bytes.length; i += 3) {
        var b1 = bytes[i]
        var b2 = i + 1 < bytes.length ? bytes[i + 1] : 0
        var b3 = i + 2 < bytes.length ? bytes[i + 2] : 0
        base64 += chars[b1 >> 2]
        base64 += chars[((b1 & 3) << 4) | (b2 >> 4)]
        base64 += i + 1 < bytes.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '='
        base64 += i + 2 < bytes.length ? chars[b3 & 63] : '='
      }
      return { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64 } }
    } catch (err) {
      console.log('Vision content error:', err.message)
      return null
    }
  }

  function validateExtractedData(result, ctx) {
    var errors = []
    if (ctx.expectedTaxId && result.extracted_tax_id) {
      var expected = ctx.expectedTaxId.replace(/\D/g, '')
      var extracted = result.extracted_tax_id.replace(/\D/g, '')
      if (expected && extracted) {
        if (expected.length >= 14 && extracted.length >= 14) {
          if (expected.substring(0, 8) !== extracted.substring(0, 8)) errors.push('CNPJ divergente')
        } else if (expected !== extracted) {
          errors.push('CPF/Tax ID divergente')
        }
      }
    }
    if (ctx.expectedPlate && result.extracted_plate) {
      var normExp = ctx.expectedPlate.toUpperCase().replace(/[^A-Z0-9]/g, '')
      var normExt = result.extracted_plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (normExp && normExt && normExp !== normExt) errors.push('Placa divergente')
    }
    return errors
  }

  function buildAnalysisLog(analysisResult, validationErrors, rawContent) {
    return {
      status: analysisResult.status,
      rejection_reason: analysisResult.rejection_reason || '',
      explanation: analysisResult.explanation || '',
      extracted_expiration_date: analysisResult.extracted_expiration_date || '',
      is_expired: !!analysisResult.is_expired,
      extracted_tax_id: analysisResult.extracted_tax_id || '',
      extracted_name: analysisResult.extracted_name || '',
      extracted_plate: analysisResult.extracted_plate || '',
      control_code: analysisResult.control_code || '',
      has_signature: !!analysisResult.has_signature,
      is_legible: analysisResult.is_legible !== false,
      match_confidence: analysisResult.match_confidence || 'Low',
      validation_errors: validationErrors,
      raw_ai_response: rawContent ? rawContent.substring(0, 2000) : '',
      analyzed_at: new Date().toISOString(),
    }
  }

  try {
    var docId = e.record.id
    var ctx = buildContext()

    var defName = 'Documento'
    var defInstructions = ''
    try {
      var defId = e.record.getString('definition')
      if (defId) {
        var def = $app.findRecordById('document_definitions', defId)
        defName = def.getString('name')
        defInstructions = def.getString('ai_validation_instructions') || ''
      }
    } catch (err) {}

    var visionContent = buildVisionContent(docId)
    var currentDate = new Date().toISOString().split('T')[0]
    var contextText =
      ctx.type === 'Veiculo'
        ? 'Entidade: Veiculo\nPlaca Esperada: ' +
          ctx.expectedPlate +
          '\nModelo Esperado: ' +
          ctx.expectedModel
        : 'Entidade: ' +
          ctx.type +
          '\nCPF/CNPJ Esperado: ' +
          ctx.expectedTaxId +
          '\nNome Esperado: ' +
          ctx.expectedName

    var systemPrompt =
      'You are an expert legal and compliance analyst specialized in Brazilian documentation (CNPJ, CPF, CNH, CRLV, FGTS, certificates, contracts, etc.). You have vision capabilities to read and analyze uploaded document images and PDFs.\n\nYour task is to analyze the provided document file and determine its validity based on the context and specific instructions provided.\n\nAnalysis requirements:\n1. Use vision to read and extract ALL visible information from the document.\n2. Verify document type: Confirm the file corresponds to the expected document type.\n3. Verify identifiers:\n   - For Suppliers (PJ/PF): Extract CNPJ/CPF and compare with the expected value. For CNPJ, consider valid if the first 8 digits (root) match.\n   - For Employees: Extract and compare CPF and Name.\n   - For Vehicles: Extract and compare license plate and model.\n4. Check authenticity: Look for control codes, QR codes, digital signatures, watermarks, or seals typical for the document type.\n5. Check validity: Extract expiration/issue date in YYYY-MM-DD format. If before current date, document is expired.\n6. Assess quality: Verify the document is legible, not cut off, properly oriented, and has sufficient resolution.\n7. Apply specific instructions: Follow any document-type-specific instructions provided.\n\nStatus decision rules:\n- "Approved": All essential criteria met (correct type, matching IDs, valid date, legible, required signatures/codes present).\n- "Rejected": Critical failure (wrong document type, illegible, ID mismatch, missing required signature/code, cut off).\n- "Vencido": Document is expired (expiration date before current date).\n- "Aguardando Aprovação": Uncertain cases requiring human review (borderline quality, partial match, unusual format).\n\nReturn STRICTLY a JSON object with no markdown formatting, no code blocks, no extra text.\n\nThe JSON object must have exactly these fields:\n{\n  "status": "Approved" | "Rejected" | "Aguardando Aprovação" | "Vencido",\n  "rejection_reason": string,\n  "explanation": string,\n  "extracted_expiration_date": "YYYY-MM-DD" | "",\n  "is_expired": boolean,\n  "extracted_tax_id": string,\n  "extracted_name": string,\n  "extracted_plate": string,\n  "control_code": string,\n  "has_signature": boolean,\n  "is_legible": boolean,\n  "match_confidence": "High" | "Medium" | "Low"\n}\n\nAll fields are required. Return ONLY the JSON object, no other text.'

    var userPrompt =
      'Analise o documento enviado.\nID do Documento: ' +
      docId +
      '\nTipo Esperado: ' +
      defName +
      '\n\nInstruções Específicas:\n' +
      (defInstructions || 'Nenhuma instrução adicional.') +
      '\n\n' +
      contextText +
      '\n\nData Atual (Referência): ' +
      currentDate +
      '\n\nInstruções da Análise:\n1. ' +
      (visionContent
        ? 'Examine o arquivo de imagem/PDF fornecido abaixo.'
        : 'Acesse o arquivo associado ao registro de documento com ID ' + docId + '.') +
      ' Use visão para ler todo o conteúdo visível.\n2. Legibilidade/Qualidade: Se o arquivo estiver ilegível, muito cortado, com resolução ruim, classifique como Rejected.\n3. Correspondência de Tipo: Verifique se o arquivo realmente é do Tipo Esperado.\n4. Identificadores: Se Fornecedor/PJ, extraia o CNPJ e compare (raiz 8 dígitos). Se Colaborador, compare CPF/Nome. Se Veículo, extraia e compare a Placa.\n5. Autenticidade: Verifique código de controle, QR Code ou assinaturas caso seja comum para o tipo.\n6. Validade: Extraia a data de vencimento no formato YYYY-MM-DD. Se anterior à Data Atual, o status DEVE ser Vencido e is_expired = true.\n7. Decisão: Approved se todos os critérios atendidos; Rejected se algo crítico falhar; Vencido se expirado; Aguardando Aprovação em casos duvidosos.\n\nRETORNE EXCLUSIVAMENTE UM JSON, SEM MARKDOWN, SEM CRASES.'

    var analysisResult = null
    var rawContent = ''
    var attempts = 0
    var lastError = null

    while (attempts < 3 && !analysisResult) {
      attempts++
      try {
        var retryMsg =
          attempts === 1
            ? userPrompt
            : 'Retorne APENAS um JSON válido estrito, sem markdown, sem texto adicional. Erro anterior: ' +
              (lastError ? lastError.message : 'desconhecido') +
              '\n\n' +
              userPrompt
        var userContent = visionContent
          ? [{ type: 'text', text: retryMsg }, visionContent]
          : retryMsg

        var chatParams = {
          model: 'fast',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
        }

        var result = $ai.chat(chatParams)
        if (!result || !result.choices || !result.choices[0] || !result.choices[0].message) {
          throw new Error('Invalid AI response structure')
        }
        rawContent = result.choices[0].message.content
        var jsonStr = cleanJsonResponse(rawContent)
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
        console.log('Attempt ' + attempts + ' failed:', err.message, rawContent)
      }
    }

    if (!analysisResult) {
      analysisResult = {
        status: 'Aguardando Aprovação',
        rejection_reason: 'Necessita de revisão humana.',
        explanation:
          'Não foi possível processar o documento automaticamente. O documento foi encaminhado para análise manual.',
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

    var validationErrors = validateExtractedData(analysisResult, ctx)
    if (validationErrors.length > 0 && analysisResult.status === 'Approved') {
      analysisResult.status = 'Rejected'
      analysisResult.rejection_reason = validationErrors.join('; ')
    }

    var docRecord = $app.findRecordById('documents', docId)
    docRecord.set('analysis_log', buildAnalysisLog(analysisResult, validationErrors, rawContent))

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
        var expDate = Date.parse(analysisResult.extracted_expiration_date)
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
      } catch (dateErr) {}
    }

    $app.save(docRecord)
  } catch (err) {
    console.log('Failed to trigger AI analyst:', err.message)
    try {
      var docRecord = $app.findRecordById('documents', e.record.id)
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set('rejection_reason', 'Necessita de revisão humana.')
      docRecord.set('analysis_log', {
        status: 'Aguardando Aprovação',
        rejection_reason: 'Necessita de revisão humana.',
        explanation:
          'Não foi possível processar o documento automaticamente. O documento foi encaminhado para análise manual.',
        raw_ai_response: '',
        validation_errors: [],
        analyzed_at: new Date().toISOString(),
        error: err.message,
        technical_error: true,
      })
      $app.save(docRecord)
    } catch (saveErr) {}
  }

  return e.next()
}, 'documents')
