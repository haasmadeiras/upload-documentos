routerAdd('POST', '/backend/v1/auth/supplier-register-verify', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim().toLowerCase()
  const code = (body.code || '').trim()
  const password = body.password || ''
  const taxIdRaw = (body.tax_id || '').trim()
  const taxIdClean = taxIdRaw.replace(/\D/g, '')

  if (!email || !code || !password || !taxIdClean) {
    return e.badRequestError('Dados inválidos.')
  }

  let otpRecord
  try {
    otpRecord = $app.findFirstRecordByFilter('otps', 'email = {:email} && code = {:code}', {
      email: email,
      code: code,
    })
  } catch (_) {
    return e.badRequestError('Código inválido ou expirado.')
  }

  let user
  try {
    user = $app.findFirstRecordByData('users', 'tax_id', taxIdClean)
  } catch (_) {}

  if (!user || user.getString('role') !== 'Fornecedor') {
    return e.badRequestError('CPF/CNPJ não localizado ou não autorizado.')
  }

  if (user.getString('passwordHash') !== '') {
    return e.badRequestError('Documento já cadastrado.')
  }

  user.setEmail(email)
  user.setPassword(password)
  user.setVerified(true)
  if (body.name) user.set('name', body.name)
  if (body.legal_name) user.set('legal_name', body.legal_name)
  if (body.phone) user.set('phone', body.phone)
  if (body.address) user.set('address', body.address)
  $app.save(user)

  $app.delete(otpRecord)

  return e.json(200, { message: 'Cadastro finalizado com sucesso.' })
})
