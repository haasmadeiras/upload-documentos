routerAdd('POST', '/backend/v1/auth/invite-verify', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim()
  const code = (body.code || '').trim()

  if (!email || !code) return e.badRequestError('E-mail e código são obrigatórios.')

  try {
    const otpRecord = $app.findFirstRecordByFilter('otps', 'email = {:email} && code = {:code}', {
      email,
      code,
    })

    const user = $app.findAuthRecordByEmail('users', email)
    user.setVerified(true)
    $app.save(user)

    $app.delete(otpRecord)

    return e.json(200, { message: 'Conta verificada com sucesso.' })
  } catch (err) {
    return e.badRequestError('Código de verificação inválido.', {
      code: 'Código de verificação inválido.',
    })
  }
})
