routerAdd(
  'GET',
  '/backend/v1/cnpj-lookup/{cnpj}',
  (e) => {
    const cnpjRaw = e.request.pathValue('cnpj') || ''
    const cnpj = cnpjRaw.replace(/\D/g, '')

    if (cnpj.length !== 14) {
      return e.json(400, { error: 'CNPJ deve conter 14 dígitos.' })
    }

    const adminEmail = (e.auth && e.auth.getString('email')) || 'system@lookup.local'

    const writeLog = (status, errorMessage) => {
      try {
        const logCol = $app.findCollectionByNameOrId('registration_logs')
        const logRecord = new Record(logCol)
        logRecord.set('tax_id', cnpj)
        logRecord.set('email', adminEmail)
        logRecord.set('status', status)
        logRecord.set('error_message', errorMessage || '')
        $app.save(logRecord)
      } catch (logErr) {
        // Logging failure should not break the lookup response
      }
    }

    // --- Primary Lookup: BrasilAPI (10s timeout) ---
    let apiResult = null
    let apiError = null

    try {
      const res = $http.send({
        url: 'https://brasilapi.com.br/api/cnpj/v1/' + cnpj,
        method: 'GET',
        timeout: 15,
      })

      if (res.statusCode === 200 && res.body) {
        try {
          const data = JSON.parse(new TextDecoder().decode(res.body))

          const addressParts = []
          if (data.logradouro) addressParts.push(data.logradouro)
          if (data.numero) addressParts.push(data.numero)
          if (data.complemento) addressParts.push(data.complemento)
          if (data.bairro) addressParts.push(data.bairro)
          const address = addressParts.filter(Boolean).join(', ')

          const cepRaw = data.cep || ''
          const cep =
            cepRaw.length >= 8 ? cepRaw.substring(0, 5) + '-' + cepRaw.substring(5, 8) : cepRaw

          apiResult = {
            legal_name: data.razao_social || '',
            name: data.nome_fantasia || data.razao_social || '',
            address: address,
            cep: cep,
            municipio: data.municipio || '',
            uf: data.uf || '',
            source: 'api',
          }
        } catch (parseErr) {
          apiError = 'Failed to parse BrasilAPI response'
        }
      } else if (res.statusCode === 404) {
        apiError = 'CNPJ not found in BrasilAPI'
      } else {
        apiError = 'BrasilAPI returned HTTP ' + res.statusCode
      }
    } catch (transportErr) {
      apiError = 'BrasilAPI timeout or connection error'
    }

    if (apiResult) {
      const hasData =
        apiResult.legal_name ||
        apiResult.name ||
        apiResult.address ||
        apiResult.cep ||
        apiResult.municipio ||
        apiResult.uf
      if (hasData) {
        writeLog('success', 'BrasilAPI lookup success')
        return e.json(200, apiResult)
      }
      apiError = 'BrasilAPI returned empty data'
    }

    // --- Fallback: Skip AI Gateway (fast model) ---
    let aiResult = null

    try {
      const reply = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'You are a Brazilian company data retrieval assistant. You search public records and return structured JSON. Always respond with ONLY valid JSON, no markdown, no commentary.',
          },
          {
            role: 'user',
            content:
              'Find the public registration data for the Brazilian company with CNPJ ' +
              cnpj +
              '. Return a JSON object with exactly these fields: ' +
              '{"legal_name":"Razao Social","name":"Nome Fantasia","cep":"CEP in format 00000-000","address":"full street address including number and district","municipio":"city name","uf":"2-letter state abbreviation"}. ' +
              'Use empty strings for fields you cannot find. Respond with JSON only.',
          },
        ],
      })

      const content = (reply.choices[0].message.content || '').trim()

      let jsonStr = content
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) jsonStr = jsonMatch[0]

      const aiData = JSON.parse(jsonStr)

      let aiCep = (aiData.cep || '').replace(/\D/g, '')
      if (aiCep.length === 8) {
        aiCep = aiCep.substring(0, 5) + '-' + aiCep.substring(5, 8)
      } else {
        aiCep = aiData.cep || ''
      }

      aiResult = {
        legal_name: aiData.legal_name || aiData.razao_social || '',
        name: aiData.name || aiData.nome_fantasia || aiData.legal_name || '',
        address: aiData.address || aiData.endereco || '',
        cep: aiCep,
        municipio: aiData.municipio || aiData.cidade || '',
        uf: (aiData.uf || aiData.estado || '').toUpperCase().substring(0, 2),
        source: 'ai',
      }
    } catch (aiErr) {
      // AI fallback also failed — proceed to failure response
    }

    if (aiResult) {
      writeLog('success', 'AI fallback lookup success')
      return e.json(200, aiResult)
    }

    // --- Both sources failed ---
    writeLog('failure', apiError || 'AI fallback also failed')
    return e.json(502, {
      error:
        'Não foi possível consultar o CNPJ automaticamente. Por favor, preencha os campos manualmente.',
    })
  },
  $apis.requireAuth(),
)
