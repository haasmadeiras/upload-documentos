routerAdd('POST', '/backend/v1/auth/supplier-register-init', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim().toLowerCase()
  const taxIdRaw = (body.tax_id || '').trim()
  const password = body.password || ''

  if (!email || !taxIdRaw || !password) {
    return e.badRequestError('E-mail, CNPJ e senha são obrigatórios.')
  }
  if (password.length < 8) {
    return e.badRequestError('A senha deve ter no mínimo 8 caracteres.')
  }

  let user
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    return e.badRequestError(
      'Cadastro de fornecedor não encontrado. Verifique os dados ou entre em contato com o administrador.',
    )
  }

  const taxIdClean = taxIdRaw.replace(/\D/g, '')
  const userTaxId = user.getString('tax_id').replace(/\D/g, '')

  if (userTaxId !== taxIdClean || user.getString('role') !== 'Fornecedor') {
    return e.badRequestError(
      'Cadastro de fornecedor não encontrado. Verifique os dados ou entre em contato com o administrador.',
    )
  }

  // Generate OTP
  const code = $security.randomStringWithAlphabet(6, '0123456789')

  const otps = $app.findCollectionByNameOrId('otps')
  const otpRecord = new Record(otps)
  otpRecord.set('email', email)
  otpRecord.set('code', code)
  $app.save(otpRecord)

  return e.json(200, { message: 'OTP gerado com sucesso.', mock_code: code })
})
