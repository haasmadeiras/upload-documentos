routerAdd(
  'GET',
  '/backend/v1/cnpj-lookup/{cnpj}',
  (e) => {
    const cnpjRaw = e.request.pathValue('cnpj') || ''
    const cnpj = cnpjRaw.replace(/\D/g, '')

    if (cnpj.length !== 14) {
      return e.json(400, { error: 'CNPJ deve conter 14 dígitos.' })
    }

    const appUrl = 'https://brasilapi.com.br/api/cnpj/v1/' + cnpj

    let res
    try {
      res = $http.send({
        url: appUrl,
        method: 'GET',
        timeout: 15,
      })
    } catch (err) {
      return e.json(502, { error: 'Falha ao conectar ao serviço de consulta de CNPJ.' })
    }

    if (res.statusCode === 404) {
      return e.json(404, { error: 'CNPJ não encontrado na base de dados oficial.' })
    }

    if (res.statusCode !== 200 || !res.body) {
      return e.json(502, { error: 'Serviço de consulta de CNPJ indisponível. Tente novamente.' })
    }

    let data
    try {
      data = JSON.parse(new TextDecoder().decode(res.body))
    } catch (err) {
      return e.json(502, { error: 'Resposta inválida do serviço de consulta de CNPJ.' })
    }

    const addressParts = []
    if (data.logradouro) addressParts.push(data.logradouro)
    if (data.numero) addressParts.push(data.numero)
    if (data.complemento) addressParts.push(data.complemento)
    if (data.bairro) addressParts.push(data.bairro)
    const address = addressParts.filter(Boolean).join(', ')

    const cepRaw = data.cep || ''
    const cep = cepRaw.length >= 8 ? cepRaw.substring(0, 5) + '-' + cepRaw.substring(5, 8) : cepRaw

    return e.json(200, {
      legal_name: data.razao_social || '',
      name: data.nome_fantasia || data.razao_social || '',
      address: address,
      cep: cep,
      municipio: data.municipio || '',
      uf: data.uf || '',
    })
  },
  $apis.requireAuth(),
)
