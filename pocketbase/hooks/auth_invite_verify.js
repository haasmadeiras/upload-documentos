routerAdd('POST', '/backend/v1/auth/invite-verify', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim()
  const code = (body.code || '').trim()
  const password = body.password || ''

  if (!email || !code || !password) {
    return e.badRequestError('Email, código e senha são obrigatórios')
  }

  if (password.length < 8) {
    return e.badRequestError('A senha deve ter no mínimo 8 caracteres')
  }

  try {
    const otpRecord = $app.findFirstRecordByData('otps', 'email', email)
    if (otpRecord.getString('code') !== code) {
      return e.badRequestError('Código inválido.')
    }

    const userRecord = $app.findAuthRecordByEmail('users', email)
    userRecord.setPassword(password)
    userRecord.setVerified(true)
    $app.save(userRecord)

    $app.delete(otpRecord)

    return e.json(200, { success: true })
  } catch (err) {
    return e.badRequestError('Falha na verificação. Código inválido ou expirado.')
  }
})
