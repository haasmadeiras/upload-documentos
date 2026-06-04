routerAdd('POST', '/backend/v1/auth/supplier-register-verify', (e) => {
  const body = e.requestInfo().body || {}
  const email = (body.email || '').trim().toLowerCase()
  const code = (body.code || '').trim()
  const password = body.password || ''
  const taxIdRaw = (body.tax_id || '').trim()
  const taxIdClean = taxIdRaw.replace(/\D/g, '')

  if (!email || !code || !password || !taxIdClean) {
    return e.badRequestError('Dados inválidos.')
  }

  let otpRecord
  try {
    otpRecord = $app.findFirstRecordByFilter('otps', 'email = {:email} && code = {:code}', {
      email: email,
      code: code,
    })
  } catch (_) {
    return e.badRequestError('Código inválido ou expirado.')
  }

  let supplier
  try {
    supplier = $app.findFirstRecordByData('suppliers', 'tax_id', taxIdClean)
  } catch (_) {}

  if (!supplier || supplier.getString('email').toLowerCase() !== email) {
    return e.badRequestError('Fornecedor não localizado ou e-mail incompatível.')
  }

  let existingUser
  try {
    existingUser = $app.findFirstRecordByData('users', 'tax_id', taxIdClean)
  } catch (_) {}

  if (existingUser) {
    return e.badRequestError('Documento já cadastrado.')
  }

  const usersCollection = $app.findCollectionByNameOrId('users')
  const newUser = new Record(usersCollection)
  newUser.setEmail(email)
  newUser.setPassword(password)
  newUser.setVerified(true)
  newUser.set('name', supplier.getString('name'))
  newUser.set('legal_name', supplier.getString('legal_name'))
  newUser.set('phone', supplier.getString('phone'))
  newUser.set('person_type', supplier.getString('person_type'))
  newUser.set('tax_id', taxIdClean)
  newUser.set('role', 'Fornecedor')
  newUser.set('isAdmin', false)
  newUser.set('supplier', supplier.id)

  $app.save(newUser)
  $app.delete(otpRecord)

  return e.json(200, { message: 'Cadastro finalizado com sucesso.' })
})
