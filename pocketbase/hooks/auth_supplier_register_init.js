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

  let user
  try {
    user = $app.findFirstRecordByData('users', 'tax_id', taxIdClean)
  } catch (_) {}

  if (!user) {
    return e.badRequestError(
      'CPF/CNPJ não localizado. Entre em contato com a administração para seu pré-cadastro.',
    )
  }

  if (user.getString('role') !== 'Fornecedor') {
    return e.badRequestError('O documento informado não pertence a um Fornecedor.')
  }

  if (user.getString('passwordHash') !== '') {
    return e.badRequestError(
      'Documento já cadastrado. Por favor, realize o login ou recupere sua senha.',
    )
  }

  let emailUser
  try {
    emailUser = $app.findAuthRecordByEmail('users', email)
  } catch (_) {}
  if (emailUser && emailUser.id !== user.id) {
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
