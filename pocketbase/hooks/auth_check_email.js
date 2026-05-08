routerAdd('POST', '/backend/v1/auth/check-email', (e) => {
  const body = e.requestInfo().body
  if (!body || !body.email) {
    return e.badRequestError('Email is required')
  }

  try {
    $app.findAuthRecordByEmail('users', body.email)
    return e.json(200, { exists: true })
  } catch (_) {
    return e.json(200, { exists: false })
  }
})
