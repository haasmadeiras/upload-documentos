routerAdd('POST', '/backend/v1/auth/check-email', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim().toLowerCase()
  if (!email) return e.badRequestError('Email is required')

  try {
    const record = $app.findAuthRecordByEmail('users', email)
    const hasPassword = record.getString('passwordHash') !== ''
    const isAdmin = record.getBool('isAdmin') || record.getString('role') === 'Admin'
    return e.json(200, { exists: true, hasPassword, isAdmin })
  } catch (_) {
    return e.json(200, { exists: false, hasPassword: false, isAdmin: false })
  }
})
