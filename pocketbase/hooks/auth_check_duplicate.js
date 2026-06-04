routerAdd('GET', '/backend/v1/auth/check-duplicate', (e) => {
  const field = e.request.url.query().get('field')
  const value = e.request.url.query().get('value')

  if (!field || !value) {
    return e.badRequestError('Missing field or value')
  }

  if (field !== 'email' && field !== 'tax_id') {
    return e.badRequestError('Invalid field')
  }

  try {
    const cleanValue = value.replace(/'/g, '')
    const raw = cleanValue.replace(/\D/g, '')
    const filter =
      field === 'email'
        ? `email = '${cleanValue}'`
        : `tax_id = '${cleanValue}' || tax_id = '${raw}'`

    $app.findFirstRecordByFilter('users', filter)
    return e.json(200, { exists: true })
  } catch (_) {
    return e.json(200, { exists: false })
  }
})
