routerAdd('POST', '/backend/v1/auth/invite-setup', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim()

  if (!email) return e.badRequestError('Email is required')

  try {
    const record = $app.findAuthRecordByEmail('users', email)
    if (record.passwordHash() !== '') {
      return e.badRequestError('Usuário já possui senha.')
    }

    const code = $security.randomStringWithAlphabet(6, '0123456789')

    let otpRecord
    try {
      otpRecord = $app.findFirstRecordByData('otps', 'email', email)
      otpRecord.set('code', code)
    } catch (_) {
      const collection = $app.findCollectionByNameOrId('otps')
      otpRecord = new Record(collection)
      otpRecord.set('email', email)
      otpRecord.set('code', code)
    }

    $app.save(otpRecord)

    return e.json(200, { success: true, mock_code: code })
  } catch (_) {
    return e.badRequestError('E-mail não encontrado.')
  }
})
