onRecordAfterCreateSuccess((e) => {
  if (e.record.getString('status') !== 'Pending') return e.next()

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
      $app.logger().warn('Context build error', 'docId', e.record.id, 'error', err.message)
    }
    return ctx
  }

  function buildVisionContent(docId) {
    try {
      var pbUrl = $secrets.get('PB_INSTANCE_URL') || ''
      var pbToken = $secrets.get('PB_SUPERUSER_TOKEN') || ''
      var filename = e.record.getString('file')
      if (!pbUrl || !pbToken || !filename) return null

      var fsys = $app.newFilesystem()
      var fileKey = e.record.baseFilesPath() + '/' + filename
      var fileExists = false
      try {
        fileExists = fsys.exists(fileKey)
      } catch (fsErr) {
        $app.logger().warn('Filesystem check failed', 'docId', docId, 'error', fsErr.message)
      }
      fsys.close()
      if (!fileExists) {
        $app.logger().warn('File not found in storage', 'docId', docId, 'key', fileKey)
        return null
      }

      var fileUrl = pbUrl + '/api/files/documents/' + docId + '/' + filename
      var rawBytes = null

      try {
        var tokenRes = $http.send({
          url: pbUrl + '/api/files/token',
          method: 'POST',
          headers: { Authorization: pbToken },
          timeout: 10,
        })
        var fileToken = ''
        if (tokenRes.statusCode === 200 && tokenRes.json) {
          fileToken = tokenRes.json.token || ''
        }
        if (fileToken) {
          var tokenUrl = fileUrl + '?token=' + encodeURIComponent(fileToken)
          var file = $filesystem.fileFromURL(tokenUrl, 30)
          if (file && file.Bytes && file.Bytes.length > 0) {
            rawBytes = file.Bytes
            $app
              .logger()
              .info('File downloaded via fileFromURL', 'docId', docId, 'size', rawBytes.length)
          }
        }
      } catch (fsErr) {
        $app
          .logger()
          .warn('fileFromURL failed, falling back to http', 'docId', docId, 'error', fsErr.message)
      }

      if (!rawBytes) {
        var fileRes = $http.send({
          url: fileUrl,
          method: 'GET',
          headers: { Authorization: pbToken },
          timeout: 30,
        })
        if (fileRes.statusCode === 200 && fileRes.body) {
          rawBytes = fileRes.body
          $app
            .logger()
            .info('File downloaded via http fallback', 'docId', docId, 'size', rawBytes.length)
        }
      }

      if (!rawBytes || rawBytes.length === 0) {
        $app.logger().warn('No file bytes retrieved', 'docId', docId)
        return null
      }
      if (rawBytes.length > 10 * 1024 * 1024) {
        $app.logger().warn('File too large for AI', 'docId', docId, 'size', rawBytes.length)
        return null
      }

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

      var byteArr = []
      for (var i = 0; i < rawBytes.length; i++) {
        byteArr.push(
          typeof rawBytes === 'string' ? rawBytes.charCodeAt(i) & 0xff : rawBytes[i] & 0xff,
        )
      }

      var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
      var parts = []
      for (var i = 0; i < byteArr.length; i += 3) {
        var b1 = byteArr[i]
        var b2 = i + 1 < byteArr.length ? byteArr[i + 1] : 0
        var b3 = i + 2 < byteArr.length ? byteArr[i + 2] : 0
        parts.push(chars[b1 >> 2])
        parts.push(chars[((b1 & 3) << 4) | (b2 >> 4)])
        parts.push(i + 1 < byteArr.length ? chars[((b2 & 15) << 2) | (b3 >> 6)] : '=')
        parts.push(i + 2 < byteArr.length ? chars[b3 & 63] : '=')
      }
      var base64 = parts.join('')

      $app
        .logger()
        .info('Vision content built', 'docId', docId, 'size', byteArr.length, 'mime', mimeType)
      return { type: 'image_url', image_url: { url: 'data:' + mimeType + ';base64,' + base64 } }
    } catch (err) {
      $app.logger().error('Vision content build failed', 'docId', docId, 'error', err.message)
      return null
    }
  }

  function validateExtractedData(extraction, ctx) {
    var errors = []
    if (ctx.expectedTaxId && extraction.extracted_tax_id) {
      var expected = ctx.expectedTaxId.replace(/\D/g, '')
      var extracted = extraction.extracted_tax_id.replace(/\D/g, '')
      if (expected && extracted) {
        if (expected.length >= 14 && extracted.length >= 14) {
          if (expected.substring(0, 8) !== extracted.substring(0, 8)) errors.push('CNPJ divergente')
        } else if (expected !== extracted) {
          errors.push('CPF/Tax ID divergente')
        }
      }
    }
    if (ctx.expectedPlate && extraction.extracted_plate) {
      var normExp = ctx.expectedPlate.toUpperCase().replace(/[^A-Z0-9]/g, '')
      var normExt = extraction.extracted_plate.toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (normExp && normExt && normExp !== normExt) errors.push('Placa divergente')
    }
    return errors
  }

  function runAiChat(messages, maxAttempts) {
    var result = null
    var rawContent = ''
    var lastError = null
    var attempt = 0
    while (attempt < maxAttempts && !result) {
      attempt++
      try {
        var res = $ai.chat({ model: 'reasoning', messages: messages })
        if (!res || !res.choices || !res.choices[0] || !res.choices[0].message) {
          throw new Error('Invalid AI response structure')
        }
        rawContent = res.choices[0].message.content
        result = JSON.parse(cleanJsonResponse(rawContent))
      } catch (err) {
        lastError = err
        $app.logger().warn('AI parse attempt failed', 'attempt', attempt, 'error', err.message)
      }
    }
    return { result: result, rawContent: rawContent, error: lastError }
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
    } catch (err) {
      $app.logger().warn('Failed to load definition', 'docId', docId, 'error', err.message)
    }

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

    if (!visionContent) {
      var docRecord = $app.findRecordById('documents', docId)
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set('rejection_reason', 'Análise Manual Necessária')
      docRecord.set('analysis_log', {
        status: 'Aguardando Aprovação',
        rejection_reason: 'Análise Manual Necessária',
        explanation: 'Não foi possível acessar o arquivo do documento para análise automática.',
        analyzed_at: new Date().toISOString(),
        model_used: 'reasoning',
        error: 'File not accessible',
      })
      $app.saveNoValidate(docRecord)
      $app.logger().info('No vision content - manual review', 'docId', docId)
      return e.next()
    }

    // Phase 1: Extraction (Vision)
    var extractionSystemPrompt =
      'You are a vision-capable AI specialized in reading and extracting information from Brazilian documents (CNPJ, CPF, CNH, CRLV, FGTS, certificates, contracts, etc.).\n\nYour task is to perform a "Vision" pass on the document and extract ALL relevant information. For multi-page PDFs, read and extract information from ALL pages.\n\nExtract:\n1. Document type\n2. Tax ID (CNPJ or CPF) - exactly as shown\n3. Name/Razão Social - exactly as shown\n4. License plate (if applicable)\n5. Expiration/issue date in YYYY-MM-DD format\n6. Control code, protocol number, or QR code content\n7. Whether document has a signature\n8. Whether document is legible\n9. Any watermarks or seals\n10. Summary of all visible text\n\nReturn STRICTLY a JSON object with no markdown formatting, no code blocks:\n{\n  "document_type": "string",\n  "extracted_tax_id": "string",\n  "extracted_name": "string",\n  "extracted_plate": "string",\n  "extracted_expiration_date": "YYYY-MM-DD or empty",\n  "is_expired": boolean,\n  "control_code": "string",\n  "has_signature": boolean,\n  "is_legible": boolean,\n  "has_watermark": boolean,\n  "raw_text_summary": "string",\n  "page_count": number,\n  "match_confidence": "High" | "Medium" | "Low"\n}\n\nAll fields are required. Return ONLY the JSON object, no other text.'

    var extractionUserPrompt =
      'Extraia TODAS as informações visíveis do documento abaixo.\nID do Documento: ' +
      docId +
      '\nTipo Esperado: ' +
      defName +
      '\n\n' +
      contextText +
      '\n\nData Atual: ' +
      currentDate +
      '\n\nPara PDFs com múltiplas páginas, leia TODAS as páginas e extraia as informações de cada uma.\n\nRETORNE EXCLUSIVAMENTE UM JSON, SEM MARKDOWN, SEM CRASES.'

    var extractionMessages = [
      { role: 'system', content: extractionSystemPrompt },
      { role: 'user', content: [{ type: 'text', text: extractionUserPrompt }, visionContent] },
    ]

    $app.logger().info('Starting extraction phase', 'docId', docId)
    var extractionRes = runAiChat(extractionMessages, 3)

    if (!extractionRes.result) {
      var docRecord = $app.findRecordById('documents', docId)
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set('rejection_reason', 'Análise Manual Necessária')
      docRecord.set('analysis_log', {
        status: 'Aguardando Aprovação',
        rejection_reason: 'Análise Manual Necessária',
        explanation:
          'Não foi possível extrair informações do documento automaticamente. O documento foi encaminhado para análise manual.',
        raw_ai_response: extractionRes.rawContent
          ? extractionRes.rawContent.substring(0, 2000)
          : '',
        analyzed_at: new Date().toISOString(),
        model_used: 'reasoning',
        error: extractionRes.error ? extractionRes.error.message : 'Unknown',
      })
      $app.saveNoValidate(docRecord)
      $app.logger().warn('Extraction phase failed', 'docId', docId)
      return e.next()
    }

    var extraction = extractionRes.result
    $app
      .logger()
      .info('Extraction phase completed', 'docId', docId, 'document_type', extraction.document_type)

    // Phase 2: Validation
    var validationSystemPrompt =
      'You are a compliance analyst specialized in Brazilian documentation.\n\nYour task is to validate the extracted document information against the provided rules and context.\n\nValidation rules:\n1. Verify the document type matches the expected type.\n2. For Suppliers (PJ/PF): Compare extracted CNPJ/CPF with expected value. For CNPJ, consider valid if the first 8 digits (root) match.\n3. For Employees: Compare extracted CPF and Name.\n4. For Vehicles: Compare extracted license plate.\n5. Check if the document is expired (expiration date before current date).\n6. Check if the document is legible and complete.\n7. Apply any specific validation instructions provided.\n8. Check for required signatures, codes, or seals.\n\nStatus decision:\n- "Approved": All essential criteria met (correct type, matching IDs, valid date, legible, required signatures/codes present).\n- "Rejected": Critical failure (wrong document type, illegible, ID mismatch, missing required signature/code).\n- "Vencido": Document is expired (expiration date before current date).\n- "Aguardando Aprovação": Uncertain cases requiring human review (borderline quality, partial match, unusual format).\n\nReturn STRICTLY a JSON object with no markdown formatting:\n{\n  "status": "Approved" | "Rejected" | "Aguardando Aprovação" | "Vencido",\n  "rejection_reason": "string (empty if Approved)",\n  "explanation": "string (detailed justification)",\n  "is_expired": boolean,\n  "match_confidence": "High" | "Medium" | "Low"\n}\n\nAll fields are required. Return ONLY the JSON object, no other text.'

    var validationUserPrompt =
      'Valide o documento com base nas informações extraídas.\n\nDados Extraídos:\n' +
      JSON.stringify(extraction, null, 2) +
      '\n\nTipo Esperado: ' +
      defName +
      '\n\nInstruções Específicas de Validação:\n' +
      (defInstructions || 'Nenhuma instrução adicional.') +
      '\n\n' +
      contextText +
      '\n\nData Atual: ' +
      currentDate +
      '\n\nRETORNE EXCLUSIVAMENTE UM JSON, SEM MARKDOWN, SEM CRASES.'

    var validationMessages = [
      { role: 'system', content: validationSystemPrompt },
      { role: 'user', content: validationUserPrompt },
    ]

    $app.logger().info('Starting validation phase', 'docId', docId)
    var validationRes = runAiChat(validationMessages, 3)

    if (!validationRes.result) {
      var validationErrors = validateExtractedData(extraction, ctx)
      var fallbackStatus = validationErrors.length > 0 ? 'Rejected' : 'Aguardando Aprovação'
      var docRecord = $app.findRecordById('documents', docId)
      docRecord.set('status', fallbackStatus)
      docRecord.set(
        'rejection_reason',
        fallbackStatus === 'Rejected' ? validationErrors.join('; ') : 'Análise Manual Necessária',
      )
      docRecord.set('analysis_log', {
        status: fallbackStatus,
        rejection_reason:
          fallbackStatus === 'Rejected' ? validationErrors.join('; ') : 'Análise Manual Necessária',
        explanation:
          'A fase de validação automática falhou. ' +
          (fallbackStatus === 'Rejected'
            ? 'Discrepâncias detectadas na validação local.'
            : 'Documento encaminhado para análise manual.'),
        extracted_tax_id: extraction.extracted_tax_id || '',
        extracted_name: extraction.extracted_name || '',
        extracted_plate: extraction.extracted_plate || '',
        extracted_expiration_date: extraction.extracted_expiration_date || '',
        is_expired: !!extraction.is_expired,
        control_code: extraction.control_code || '',
        has_signature: !!extraction.has_signature,
        is_legible: extraction.is_legible !== false,
        match_confidence: extraction.match_confidence || 'Low',
        validation_errors: validationErrors,
        extraction_phase: extraction,
        raw_extraction_response: extractionRes.rawContent
          ? extractionRes.rawContent.substring(0, 2000)
          : '',
        raw_validation_response: validationRes.rawContent
          ? validationRes.rawContent.substring(0, 2000)
          : '',
        analyzed_at: new Date().toISOString(),
        model_used: 'reasoning',
        validation_error: validationRes.error ? validationRes.error.message : 'Unknown',
      })
      if (
        extraction.extracted_expiration_date &&
        extraction.extracted_expiration_date.includes('-')
      ) {
        try {
          var expDate = Date.parse(extraction.extracted_expiration_date)
          if (!isNaN(expDate)) {
            docRecord.set(
              'expiration_date',
              extraction.extracted_expiration_date + ' 12:00:00.000Z',
            )
            if (expDate < Date.now()) {
              docRecord.set('status', 'Vencido')
              docRecord.set('rejection_reason', 'Documento vencido.')
            }
          }
        } catch (dateErr) {}
      }
      $app.saveNoValidate(docRecord)
      $app.logger().warn('Validation phase failed', 'docId', docId)
      return e.next()
    }

    var validation = validationRes.result
    $app.logger().info('Validation phase completed', 'docId', docId, 'status', validation.status)

    var validationErrors = validateExtractedData(extraction, ctx)
    if (validationErrors.length > 0 && validation.status === 'Approved') {
      validation.status = 'Rejected'
      validation.rejection_reason = validationErrors.join('; ')
    }

    var analysisLog = {
      status: validation.status,
      rejection_reason: validation.rejection_reason || '',
      explanation: validation.explanation || '',
      extracted_expiration_date: extraction.extracted_expiration_date || '',
      is_expired: !!validation.is_expired || !!extraction.is_expired,
      extracted_tax_id: extraction.extracted_tax_id || '',
      extracted_name: extraction.extracted_name || '',
      extracted_plate: extraction.extracted_plate || '',
      control_code: extraction.control_code || '',
      has_signature: !!extraction.has_signature,
      is_legible: extraction.is_legible !== false,
      match_confidence: validation.match_confidence || extraction.match_confidence || 'Low',
      validation_errors: validationErrors,
      extraction_phase: extraction,
      validation_phase: validation,
      raw_extraction_response: extractionRes.rawContent
        ? extractionRes.rawContent.substring(0, 2000)
        : '',
      raw_validation_response: validationRes.rawContent
        ? validationRes.rawContent.substring(0, 2000)
        : '',
      analyzed_at: new Date().toISOString(),
      model_used: 'reasoning',
    }

    var docRecord = $app.findRecordById('documents', docId)
    docRecord.set('analysis_log', analysisLog)

    if (validation.status === 'Approved') {
      docRecord.set('status', 'Approved')
      docRecord.set('rejection_reason', '')
    } else if (validation.status === 'Rejected') {
      docRecord.set('status', 'Rejected')
      docRecord.set(
        'rejection_reason',
        validation.rejection_reason || validation.explanation || 'Documento inválido ou ilegível.',
      )
    } else if (validation.status === 'Vencido' || validation.is_expired || extraction.is_expired) {
      docRecord.set('status', 'Vencido')
      docRecord.set(
        'rejection_reason',
        validation.rejection_reason || validation.explanation || 'Documento vencido.',
      )
    } else {
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set('rejection_reason', 'Análise Manual Necessária')
    }

    if (
      extraction.extracted_expiration_date &&
      extraction.extracted_expiration_date.includes('-')
    ) {
      try {
        var expDate = Date.parse(extraction.extracted_expiration_date)
        if (!isNaN(expDate)) {
          docRecord.set('expiration_date', extraction.extracted_expiration_date + ' 12:00:00.000Z')
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
    $app
      .logger()
      .info(
        'Document AI analysis completed',
        'docId',
        docId,
        'status',
        docRecord.getString('status'),
      )
  } catch (err) {
    $app.logger().error('Failed to trigger AI analyst', 'docId', e.record.id, 'error', err.message)
    try {
      var docRecord = $app.findRecordById('documents', e.record.id)
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set('rejection_reason', 'Análise Manual Necessária')
      docRecord.set('analysis_log', {
        status: 'Aguardando Aprovação',
        rejection_reason: 'Análise Manual Necessária',
        explanation:
          'Não foi possível processar o documento automaticamente. O documento foi encaminhado para análise manual.',
        analyzed_at: new Date().toISOString(),
        model_used: 'reasoning',
        error: err.message,
        technical_error: true,
      })
      $app.saveNoValidate(docRecord)
    } catch (saveErr) {
      $app
        .logger()
        .error('Fallback save also failed', 'docId', e.record.id, 'error', saveErr.message)
    }
  }

  return e.next()
}, 'documents')
