routerAdd('POST', '/backend/v1/auth/supplier-register-verify', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim().toLowerCase()
  const code = (body.code || '').trim()
  const password = body.password || ''

  if (!email || !code || !password) {
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
    user = $app.findAuthRecordByEmail('users', email)
  } catch (_) {
    return e.badRequestError('Usuário não encontrado.')
  }

  user.setPassword(password)
  user.setVerified(true)
  $app.save(user)

  $app.delete(otpRecord)

  return e.json(200, { message: 'Senha atualizada com sucesso.' })
})
