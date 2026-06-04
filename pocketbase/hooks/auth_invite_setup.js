routerAdd('POST', '/backend/v1/auth/invite-setup', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim()
  const password = body.password

  if (!email || !password) return e.badRequestError('E-mail e senha são obrigatórios.')
  if (password.length < 8)
    return e.badRequestError('A senha deve ter no mínimo 8 caracteres.', {
      password: 'A senha deve ter no mínimo 8 caracteres.',
    })

  try {
    const user = $app.findAuthRecordByEmail('users', email)
    if (user.getBool('verified')) {
      return e.badRequestError('Usuário já registrado.')
    }

    user.setPassword(password)
    $app.save(user)

    const code = $security.randomStringWithAlphabet(6, '0123456789')

    try {
      const existing = $app.findRecordsByFilter('otps', 'email = {:email}', '-created', 100, 0, {
        email,
      })
      for (const record of existing) {
        $app.delete(record)
      }
    } catch (_) {}

    const otpsCol = $app.findCollectionByNameOrId('otps')
    const otpRecord = new Record(otpsCol)
    otpRecord.set('email', email)
    otpRecord.set('code', code)
    $app.save(otpRecord)

    return e.json(200, { message: 'Senha configurada. Código enviado.', mock_code: code })
  } catch (err) {
    return e.badRequestError('Erro ao configurar senha. Verifique os dados.')
  }
})
