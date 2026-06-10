onRecordAfterUpdateSuccess((e) => {
  const supplier = e.record

  // Sync supplier contact info to linked users
  try {
    const taxId = supplier.getString('tax_id')
    if (taxId) {
      const taxIdClean = taxId.replace(/\D/g, '')
      const taxIdFormatted =
        taxIdClean.length === 11
          ? taxIdClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
          : taxIdClean.length === 14
            ? taxIdClean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
            : taxId

      const users = $app.findRecordsByFilter(
        'users',
        'tax_id = {:clean} || tax_id = {:formatted}',
        '-created',
        100,
        0,
        { clean: taxIdClean, formatted: taxIdFormatted },
      )

      for (const user of users) {
        if (user.getString('role') === 'Fornecedor') {
          let changed = false
          if (
            supplier.getString('legal_name') &&
            user.getString('legal_name') !== supplier.getString('legal_name')
          ) {
            user.set('legal_name', supplier.getString('legal_name'))
            changed = true
          }
          if (
            supplier.getString('address') &&
            user.getString('address') !== supplier.getString('address')
          ) {
            user.set('address', supplier.getString('address'))
            changed = true
          }
          if (
            supplier.getString('phone') &&
            user.getString('phone') !== supplier.getString('phone')
          ) {
            user.set('phone', supplier.getString('phone'))
            changed = true
          }
          if (changed) {
            $app.saveNoValidate(user)
          }
        }
      }
    }
  } catch (err) {
    console.log('Error syncing supplier to users: ' + err.message)
  }

  // Sync supplier location to linked forest area
  const forestId = supplier.getString('forest_area')
  if (forestId) {
    try {
      const forest = $app.findRecordById('forest_areas', forestId)
      const endereco = supplier.getString('address')
      const cep = supplier.getString('cep')
      const municipio = supplier.getString('municipio')
      const uf = supplier.getString('uf')

      const parts = []
      if (endereco) parts.push(endereco)
      if (municipio || uf) parts.push(`${municipio}${municipio && uf ? ' - ' : ''}${uf}`)
      if (cep) parts.push(`CEP: ${cep}`)
      const locationStr = parts.join(', ')

      if (locationStr && forest.getString('location') !== locationStr) {
        forest.set('location', locationStr)
        $app.saveNoValidate(forest)
      }
    } catch (err) {
      console.log('Error syncing supplier location to forest area: ' + err.message)
    }
  }

  e.next()
}, 'suppliers')
