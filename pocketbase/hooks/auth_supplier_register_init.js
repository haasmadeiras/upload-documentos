routerAdd('POST', '/backend/v1/auth/supplier-register-init', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim().toLowerCase()
  const taxIdRaw = (body.tax_id || '').trim()
  const password = body.password || ''

  if (!email || !taxIdRaw || !password) {
    return e.badRequestError('E-mail, CPF/CNPJ e senha são obrigatórios.')
  }
  if (password.length < 8) {
    return e.badRequestError('A senha deve ter no mínimo 8 caracteres.')
  }

  const taxIdClean = taxIdRaw.replace(/\D/g, '')

  let supplier
  try {
    supplier = $app.findFirstRecordByData('suppliers', 'tax_id', taxIdClean)
  } catch (_) {}

  if (!supplier) {
    return e.badRequestError('Fornecedor não pré-cadastrado. Entre em contato com o suporte.')
  }

  if (supplier.getString('email').toLowerCase() !== email) {
    return e.badRequestError('O e-mail informado não coincide com os dados de pré-cadastro.')
  }

  let existingUser
  try {
    existingUser = $app.findFirstRecordByData('users', 'tax_id', taxIdClean)
  } catch (_) {}

  if (existingUser) {
    return e.badRequestError(
      'Documento já cadastrado. Por favor, realize o login ou recupere sua senha.',
    )
  }

  let emailUser
  try {
    emailUser = $app.findAuthRecordByEmail('users', email)
  } catch (_) {}

  if (emailUser) {
    return e.badRequestError('Este e-mail já está em uso por outro usuário.')
  }

  const code = $security.randomStringWithAlphabet(6, '0123456789')
  const otps = $app.findCollectionByNameOrId('otps')
  const otpRecord = new Record(otps)
  otpRecord.set('email', email)
  otpRecord.set('code', code)
  $app.save(otpRecord)

  return e.json(200, { message: 'OTP gerado com sucesso.', mock_code: code })
})
