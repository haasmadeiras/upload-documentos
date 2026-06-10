routerAdd('GET', '/backend/v1/auth/supplier-check', (e) => {
  const taxIdRaw = e.request.url.query().get('tax_id') || ''
  const taxIdClean = taxIdRaw.replace(/\D/g, '')

  if (!taxIdClean) return e.badRequestError('Documento inválido.')

  let user = null
  try {
    user = $app.findFirstRecordByData('users', 'tax_id', taxIdClean)
  } catch (_) {}

  if (user) {
    return e.json(200, {
      exists: true,
      hasUser: true,
      message: 'Usuário já cadastrado com este documento.',
    })
  }

  let supplier = null
  try {
    supplier = $app.findFirstRecordByData('suppliers', 'tax_id', taxIdClean)
  } catch (_) {}

  if (!supplier) {
    return e.json(200, {
      exists: false,
      hasUser: false,
      message: 'Fornecedor não pré-cadastrado. Entre em contato com o suporte.',
    })
  }

  return e.json(200, {
    exists: true,
    hasUser: false,
    person_type: supplier.getString('person_type'),
  })
})
