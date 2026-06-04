routerAdd('POST', '/backend/v1/auth/check-email', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim()
  if (!email) return e.badRequestError('Email is required')

  try {
    const record = $app.findAuthRecordByEmail('users', email)
    const hasPassword = record.passwordHash() !== ''
    return e.json(200, { exists: true, hasPassword })
  } catch (_) {
    return e.json(200, { exists: false, hasPassword: false })
  }
})
