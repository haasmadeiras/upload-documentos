onRecordCreate((e) => {
  const role = e.record.getString('role')
  if (role === 'Fornecedor') {
    const taxId = e.record.getString('tax_id')
    if (!taxId) {
      throw new BadRequestError('Documento (CPF/CNPJ) é obrigatório para fornecedores.', {
        tax_id: new ValidationError('required', 'Documento é obrigatório'),
      })
    }

    const taxIdClean = taxId.replace(/\D/g, '')
    let taxIdFormatted = taxIdClean
    if (taxIdClean.length === 11) {
      taxIdFormatted = taxIdClean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
    } else if (taxIdClean.length === 14) {
      taxIdFormatted = taxIdClean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
    }

    let supplier = null
    try {
      const records = $app.findRecordsByFilter(
        'suppliers',
        'tax_id = {:clean} || tax_id = {:formatted}',
        '-created',
        1,
        0,
        { clean: taxIdClean, formatted: taxIdFormatted },
      )
      if (records.length > 0) {
        supplier = records[0]
      }
    } catch (_) {}

    if (!supplier) {
      throw new BadRequestError('Fornecedor não encontrado para o documento informado.', {
        tax_id: new ValidationError('not_found', 'Nenhum fornecedor corresponde a este documento.'),
      })
    }

    // Auto-Populate fields
    e.record.set('supplier', supplier.id)

    const supplierEmail = supplier.getString('email')
    if (supplierEmail) {
      e.record.setEmail(supplierEmail)
    }

    const supplierLegalName = supplier.getString('legal_name')
    if (supplierLegalName) {
      e.record.set('legal_name', supplierLegalName)
    }

    const supplierAddress = supplier.getString('address')
    if (supplierAddress) {
      e.record.set('address', supplierAddress)
    }

    if (!e.record.getString('name')) {
      e.record.set('name', supplier.getString('name'))
    }

    // Ensure role assignment and isAdmin: false as per AC
    e.record.set('isAdmin', false)
  }

  e.next()
}, 'users')
