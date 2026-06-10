onRecordAuthRequest((e) => {
  if (e.record.getBool('active') === false) {
    return e.forbiddenError('Conta inativa. Entre em contato com o administrador.')
  }
  return e.next()
}, 'users')
