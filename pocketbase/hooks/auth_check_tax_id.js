routerAdd('GET', '/backend/v1/auth/check-tax-id', (e) => {
  const taxIdRaw = (e.request.url.query().get('tax_id') || '').trim()
  const taxIdClean = taxIdRaw.replace(/\D/g, '')
  if (!taxIdClean) return e.json(200, { exists: false })

  try {
    const user = $app.findFirstRecordByData('users', 'tax_id', taxIdClean)
    const hasPassword = user.getString('passwordHash') !== ''
    return e.json(200, {
      exists: true,
      hasPassword: hasPassword,
      email: user.getString('email'),
      name: user.getString('name'),
      legal_name: user.getString('legal_name'),
      phone: user.getString('phone'),
      address: user.getString('address'),
      person_type: user.getString('person_type'),
    })
  } catch (_) {
    return e.json(200, { exists: false })
  }
})
