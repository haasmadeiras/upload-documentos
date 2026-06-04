routerAdd('POST', '/backend/v1/auth/reset-password-init', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim().toLowerCase()

  if (!email) {
    return e.badRequestError('E-mail é obrigatório.')
  }

  let user
  try {
    user = $app.findAuthRecordByEmail('users', email)
  } catch (_) {}

  if (!user) {
    return e.json(200, {
      message: 'Se o e-mail existir, um código será enviado.',
      mock_code: '000000',
    })
  }

  const code = $security.randomStringWithAlphabet(6, '0123456789')
  const otps = $app.findCollectionByNameOrId('otps')
  const otpRecord = new Record(otps)
  otpRecord.set('email', email)
  otpRecord.set('code', code)
  $app.save(otpRecord)

  return e.json(200, { message: 'Se o e-mail existir, um código será enviado.', mock_code: code })
})
