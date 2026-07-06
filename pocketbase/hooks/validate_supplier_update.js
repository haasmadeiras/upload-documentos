onRecordUpdate((e) => {
  const supplierType = e.record.getString('supplier_type') || 'MATRIZ'
  const parentSupplier = e.record.getString('parent_supplier')

  if (supplierType === 'MATRIZ') {
    e.record.set('parent_supplier', '')
  } else if (supplierType === 'FILIAL') {
    if (!parentSupplier) {
      throw new BadRequestError('Fornecedor do tipo FILIAL deve ter uma MATRIZ vinculada.', {
        parent_supplier: new ValidationError(
          'required',
          'Vinculo com MATRIZ e obrigatorio para FILIAL.',
        ),
      })
    }

    if (parentSupplier === e.record.id) {
      throw new BadRequestError('Um fornecedor nao pode ser vinculado a si mesmo.', {
        parent_supplier: new ValidationError('invalid', 'Nao e possivel vincular a si mesmo.'),
      })
    }

    try {
      const parent = $app.findRecordById('suppliers', parentSupplier)
      const parentType = parent.getString('supplier_type') || 'MATRIZ'
      if (parentType !== 'MATRIZ') {
        throw new BadRequestError('O fornecedor vinculado deve ser do tipo MATRIZ.', {
          parent_supplier: new ValidationError(
            'invalid',
            'O fornecedor vinculado deve ser MATRIZ.',
          ),
        })
      }
    } catch (err) {
      if (err instanceof BadRequestError) throw err
      throw new BadRequestError('Fornecedor vinculado nao encontrado.', {
        parent_supplier: new ValidationError('not_found', 'Fornecedor vinculado nao encontrado.'),
      })
    }
  }

  e.next()
}, 'suppliers')
