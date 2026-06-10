routerAdd(
  'POST',
  '/backend/v1/auth/supplier-verify',
  (e) => {
    const body = e.requestInfo().body || {}
    const taxIdRaw = (body.tax_id || '').trim()
    const email = (body.email || '').trim().toLowerCase()

    if (!taxIdRaw || !email) {
      return e.badRequestError('Documento e e-mail são obrigatórios.')
    }

    const taxIdClean = taxIdRaw.replace(/\D/g, '')

    let supplier
    try {
      supplier = $app.findFirstRecordByData('suppliers', 'tax_id', taxIdClean)
    } catch (_) {
      return e.badRequestError('Fornecedor não localizado. Entre em contato com o suporte.')
    }

    if (supplier.getString('email').toLowerCase() !== email) {
      return e.badRequestError('Fornecedor não localizado. Entre em contato com o suporte.')
    }

    let existingUser
    try {
      existingUser = $app.findFirstRecordByData('users', 'tax_id', taxIdClean)
    } catch (_) {}

    if (existingUser) {
      return e.badRequestError('Usuário já cadastrado. Tente recuperar sua senha.')
    }

    return e.json(200, {
      message: 'Fornecedor verificado com sucesso.',
      supplier_id: supplier.id,
      name: supplier.getString('name'),
    })
  },
  $apis.requireGuestOnly(),
)
