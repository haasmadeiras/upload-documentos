migrate(
  (app) => {
    // Clean up any existing duplicates to ensure the unique index applies successfully
    app
      .db()
      .newQuery(`
    DELETE FROM users WHERE id NOT IN (
      SELECT MIN(id) FROM users GROUP BY tax_id
    ) AND tax_id IS NOT NULL AND tax_id != ''
  `)
      .execute()

    const col = app.findCollectionByNameOrId('users')
    col.addIndex('idx_users_tax_id', true, 'tax_id', '')
    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('users')
    col.removeIndex('idx_users_tax_id')
    app.save(col)
  },
)
