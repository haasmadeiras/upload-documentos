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

    const logsCol = $app.findCollectionByNameOrId('registration_logs')

    let supplier
    try {
      supplier = $app.findFirstRecordByData('suppliers', 'tax_id', taxIdClean)
    } catch (_) {
      const log = new Record(logsCol)
      log.set('tax_id', taxIdClean)
      log.set('email', email)
      log.set('status', 'failure')
      log.set('error_message', 'Tax ID not found')
      $app.save(log)
      return e.badRequestError(
        'O CPF/CNPJ informado não foi encontrado em nossa base de pré-cadastro.',
      )
    }

    if (supplier.getString('email').toLowerCase() !== email) {
      const log = new Record(logsCol)
      log.set('tax_id', taxIdClean)
      log.set('email', email)
      log.set('status', 'failure')
      log.set('error_message', 'Email mismatch')
      $app.save(log)
      return e.badRequestError(
        'O e-mail informado não coincide com o e-mail vinculado ao CPF/CNPJ em nossa base.',
      )
    }

    let existingUser
    try {
      existingUser = $app.findFirstRecordByData('users', 'tax_id', taxIdClean)
    } catch (_) {}

    if (existingUser) {
      const log = new Record(logsCol)
      log.set('tax_id', taxIdClean)
      log.set('email', email)
      log.set('status', 'failure')
      log.set('error_message', 'User already exists')
      $app.save(log)
      return e.badRequestError('Usuário já cadastrado. Tente recuperar sua senha.')
    }

    const log = new Record(logsCol)
    log.set('tax_id', taxIdClean)
    log.set('email', email)
    log.set('status', 'success')
    $app.save(log)

    return e.json(200, {
      message: 'Fornecedor verificado com sucesso.',
      supplier_id: supplier.id,
      name: supplier.getString('name'),
    })
  },
  $apis.requireGuestOnly(),
)
