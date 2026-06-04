routerAdd('POST', '/backend/v1/auth/invite-check', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim()

  if (!email) return e.badRequestError('E-mail é obrigatório.', { email: 'E-mail é obrigatório.' })

  try {
    const user = $app.findAuthRecordByEmail('users', email)
    if (user.getBool('verified')) {
      return e.badRequestError('Este e-mail já está registrado e ativo. Por favor, faça login.', {
        email: 'Este e-mail já está registrado e ativo. Por favor, faça login.',
      })
    }
    return e.json(200, { status: 'pending' })
  } catch (err) {
    return e.badRequestError('E-mail não autorizado. Por favor, contate o administrador.', {
      email: 'E-mail não autorizado. Por favor, contate o administrador.',
    })
  }
})
