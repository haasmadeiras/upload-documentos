routerAdd('POST', '/backend/v1/auth/invite-check', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim()
  if (!email) return e.badRequestError('Email is required')

  try {
    const record = $app.findAuthRecordByEmail('users', email)
    if (record.passwordHash() !== '') {
      return e.badRequestError('Este usuário já possui uma senha definida. Faça o login.')
    }
    return e.json(200, { success: true })
  } catch (_) {
    return e.badRequestError('E-mail não encontrado ou não foi convidado.')
  }
})
