routerAdd('GET', '/backend/v1/auth/check-tax-id', (e) => {
  const taxIdRaw = (e.request.url.query().get('tax_id') || '').trim()
  const taxIdClean = taxIdRaw.replace(/\D/g, '')
  if (!taxIdClean) return e.json(200, { exists: false })

  let taxIdFormatted = taxIdClean
  if (taxIdClean.length === 11) {
    taxIdFormatted = taxIdClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  } else if (taxIdClean.length === 14) {
    taxIdFormatted = taxIdClean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }

  try {
    const records = $app.findRecordsByFilter(
      'users',
      'tax_id = {:clean} || tax_id = {:formatted}',
      '-created',
      1,
      0,
      { clean: taxIdClean, formatted: taxIdFormatted },
    )
    if (records.length === 0) throw new Error('not found')
    const user = records[0]
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
