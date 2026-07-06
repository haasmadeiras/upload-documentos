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
      $app.logger().warn('Context build error', 'docId', e.record.id, 'error', err.message)
    }
    return ctx
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

    var extractionMethod = e.record.getString('extraction_method')
    var extractedText = e.record.getString('extracted_text')

    // Router: only documents with an extracted text layer are validated by the AI.
    // Images / scanned PDFs (no text) go to manual review (OCR is a later phase).
    if (extractionMethod !== 'text' || !extractedText || extractedText.trim().length === 0) {
      var docImg = $app.findRecordById('documents', docId)
      docImg.set('status', 'Aguardando Aprovação')
      docImg.set('rejection_reason', 'Análise Manual Necessária')
      docImg.set('analysis_log', {
        status: 'Aguardando Aprovação',
        rejection_reason: 'Análise Manual Necessária',
        explanation:
          'O documento é uma imagem ou PDF digitalizado sem camada de texto. A análise automática por OCR ainda não está disponível; o documento foi encaminhado para análise manual.',
        extraction_method: extractionMethod || 'image',
        analyzed_at: new Date().toISOString(),
        model_used: 'reasoning',
        pending_ocr: true,
      })
      $app.saveNoValidate(docImg)
      $app.logger().info('Image document routed to manual review', 'docId', docId)
      return e.next()
    }

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
      'You are a compliance analyst specialized in Brazilian documentation (CND, CNPJ, CPF, CNH, CRLV, FGTS, certificates, contracts, etc.).\n\nYou receive the EXTRACTED TEXT of a document (already read from its text layer) together with the expected context and specific validation instructions. Analyze the text, extract the relevant fields, and decide the document validity.\n\nValidation rules:\n1. Verify the document type matches the expected type.\n2. For Fornecedor/Usuario (PJ/PF): compare the extracted CNPJ/CPF with the expected value. For CNPJ, consider it valid if the first 8 digits (root) match.\n3. For Colaborador: compare the extracted CPF and name.\n4. For Veiculo: compare the extracted license plate.\n5. Extract the expiration/validity/issue date in YYYY-MM-DD format. CRITICAL DATE LOGIC: Compare the extracted date with the Current Date. Perform a strict chronological comparison (Year, then Month, then Day). If the extracted date is strictly BEFORE the Current Date, the document is EXPIRED (`is_expired`: true). Your explanation MUST factually match this comparison and explicitly state if the date is in the past or future.\n6. Apply any specific validation instructions provided.\n7. Check for control codes, protocol numbers or authentication codes typical of the document type.\n\nStatus decision:\n- "Approved": all essential criteria met (correct type, matching IDs, valid date, required codes present).\n- "Rejected": critical failure (wrong document type, ID mismatch, missing required code, clearly invalid).\n- "Vencido": document is expired (expiration date before current date). When the document is expired, set both "rejection_reason" and "explanation" to exactly "DOCUMENTO VENCIDO" with no additional text or date comparisons.\n- "Aguardando Aprovação": uncertain cases requiring human review (partial match, key info not present in the text, unusual format).\n\nReturn STRICTLY a JSON object with no markdown formatting, no code blocks:\n{\n  "status": "Approved" | "Rejected" | "Aguardando Aprovação" | "Vencido",\n  "rejection_reason": "string (empty if Approved)",\n  "explanation": "string (detailed justification in Portuguese, with correct date math)",\n  "extracted_tax_id": "string",\n  "extracted_name": "string",\n  "extracted_plate": "string",\n  "extracted_expiration_date": "YYYY-MM-DD or empty",\n  "is_expired": boolean,\n  "match_confidence": "High" | "Medium" | "Low"\n}\n\nAll fields are required. Return ONLY the JSON object, no other text.'

    var userPrompt =
      'Valide o documento com base no TEXTO EXTRAÍDO abaixo.\n\nTipo Esperado: ' +
      defName +
      '\n\nInstruções Específicas de Validação:\n' +
      (defInstructions || 'Nenhuma instrução adicional.') +
      '\n\n' +
      contextText +
      '\n\nData Atual do Sistema: ' +
      currentDate +
      '\n\nTEXTO EXTRAÍDO DO DOCUMENTO:\n"""\n' +
      extractedText +
      '\n"""\n\nRETORNE EXCLUSIVAMENTE UM JSON, SEM MARKDOWN, SEM CRASES.'

    var messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]

    $app.logger().info('Starting text validation', 'docId', docId)
    var aiRes = runAiChat(messages, 3)

    if (!aiRes.result) {
      // Local fallback: check whether the expected tax id appears in the text.
      var localErrors = []
      if (ctx.expectedTaxId) {
        var expDigits = ctx.expectedTaxId.replace(/\D/g, '')
        var textDigits = extractedText.replace(/\D/g, '')
        var root = expDigits.length >= 14 ? expDigits.substring(0, 8) : expDigits
        if (root && textDigits.indexOf(root) === -1) {
          localErrors.push('CPF/CNPJ esperado não encontrado no documento')
        }
      }
      var fallbackStatus = localErrors.length > 0 ? 'Rejected' : 'Aguardando Aprovação'
      var docFail = $app.findRecordById('documents', docId)
      docFail.set('status', fallbackStatus)
      docFail.set(
        'rejection_reason',
        fallbackStatus === 'Rejected' ? localErrors.join('; ') : 'Análise Manual Necessária',
      )
      docFail.set('analysis_log', {
        status: fallbackStatus,
        rejection_reason:
          fallbackStatus === 'Rejected' ? localErrors.join('; ') : 'Análise Manual Necessária',
        explanation:
          'A validação automática falhou ao interpretar a resposta do modelo. ' +
          (fallbackStatus === 'Rejected'
            ? 'O CPF/CNPJ esperado não foi localizado no texto do documento.'
            : 'Documento encaminhado para análise manual.'),
        extraction_method: 'text',
        raw_ai_response: aiRes.rawContent ? aiRes.rawContent.substring(0, 2000) : '',
        analyzed_at: new Date().toISOString(),
        model_used: 'reasoning',
        error: aiRes.error ? aiRes.error.message : 'Unknown',
      })
      $app.saveNoValidate(docFail)
      $app.logger().warn('Text validation failed', 'docId', docId)
      return e.next()
    }

    var result = aiRes.result

    var validationErrors = validateExtractedData(result, ctx)
    if (validationErrors.length > 0 && result.status === 'Approved') {
      result.status = 'Rejected'
      result.rejection_reason = validationErrors.join('; ')
    }

    var isVencido = result.status === 'Vencido' || result.is_expired
    var analysisLog = {
      status: isVencido ? 'Vencido' : result.status,
      rejection_reason: isVencido ? 'DOCUMENTO VENCIDO' : result.rejection_reason || '',
      explanation: isVencido ? 'DOCUMENTO VENCIDO' : result.explanation || '',
      extracted_tax_id: result.extracted_tax_id || '',
      extracted_name: result.extracted_name || '',
      extracted_plate: result.extracted_plate || '',
      extracted_expiration_date: result.extracted_expiration_date || '',
      is_expired: !!result.is_expired,
      match_confidence: result.match_confidence || 'Low',
      validation_errors: validationErrors,
      extraction_method: 'text',
      raw_ai_response: aiRes.rawContent ? aiRes.rawContent.substring(0, 2000) : '',
      analyzed_at: new Date().toISOString(),
      model_used: 'reasoning',
    }

    var docRecord = $app.findRecordById('documents', docId)
    docRecord.set('analysis_log', analysisLog)

    if (result.status === 'Approved') {
      docRecord.set('status', 'Approved')
      docRecord.set('rejection_reason', '')
    } else if (result.status === 'Rejected') {
      docRecord.set('status', 'Rejected')
      docRecord.set(
        'rejection_reason',
        result.rejection_reason || result.explanation || 'Documento inválido ou ilegível.',
      )
    } else if (result.status === 'Vencido' || result.is_expired) {
      docRecord.set('status', 'Vencido')
      docRecord.set('rejection_reason', 'DOCUMENTO VENCIDO')
    } else {
      docRecord.set('status', 'Aguardando Aprovação')
      docRecord.set('rejection_reason', 'Análise Manual Necessária')
    }

    if (result.extracted_expiration_date && result.extracted_expiration_date.includes('-')) {
      try {
        var expDate = Date.parse(result.extracted_expiration_date)
        if (!isNaN(expDate)) {
          docRecord.set('expiration_date', result.extracted_expiration_date + ' 12:00:00.000Z')
          if (expDate < Date.now()) {
            if (docRecord.getString('status') !== 'Vencido') {
              docRecord.set('status', 'Vencido')
              docRecord.set('rejection_reason', 'DOCUMENTO VENCIDO')
              var currentLog = docRecord.get('analysis_log') || {}
              currentLog.status = 'Vencido'
              currentLog.is_expired = true
              currentLog.explanation = 'DOCUMENTO VENCIDO'
              currentLog.rejection_reason = 'DOCUMENTO VENCIDO'
              docRecord.set('analysis_log', currentLog)
            }
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
      var docErr = $app.findRecordById('documents', e.record.id)
      docErr.set('status', 'Aguardando Aprovação')
      docErr.set('rejection_reason', 'Análise Manual Necessária')
      docErr.set('analysis_log', {
        status: 'Aguardando Aprovação',
        rejection_reason: 'Análise Manual Necessária',
        explanation:
          'Não foi possível processar o documento automaticamente. O documento foi encaminhado para análise manual.',
        analyzed_at: new Date().toISOString(),
        model_used: 'reasoning',
        error: err.message,
        technical_error: true,
      })
      $app.saveNoValidate(docErr)
    } catch (saveErr) {
      $app
        .logger()
        .error('Fallback save also failed', 'docId', e.record.id, 'error', saveErr.message)
    }
  }

  return e.next()
}, 'documents')
