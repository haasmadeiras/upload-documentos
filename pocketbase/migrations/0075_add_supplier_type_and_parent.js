migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')

    if (!col.fields.getByName('supplier_type')) {
      col.fields.add(
        new SelectField({
          name: 'supplier_type',
          values: ['MATRIZ', 'FILIAL'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('parent_supplier')) {
      col.fields.add(
        new RelationField({
          name: 'parent_supplier',
          collectionId: col.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }

    app.save(col)

    app
      .db()
      .newQuery(
        "UPDATE suppliers SET supplier_type = 'MATRIZ' WHERE supplier_type IS NULL OR supplier_type = ''",
      )
      .execute()

    col.addIndex('idx_suppliers_parent_supplier', false, 'parent_supplier', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('suppliers')
    col.removeIndex('idx_suppliers_parent_supplier')
    col.fields.removeByName('supplier_type')
    col.fields.removeByName('parent_supplier')
    app.save(col)
  },
)
