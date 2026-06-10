migrate(
  (app) => {
    let count = 0
    while (true) {
      const docs = app.findRecordsByFilter('documents', '1=1', '', 1000, 0)
      if (docs.length === 0) break
      for (let i = 0; i < docs.length; i++) {
        app.delete(docs[i])
        count++
      }
    }

    try {
      const logsCol = app.findCollectionByNameOrId('audit_logs')
      const log = new Record(logsCol)
      log.set('action', 'Delete')
      log.set('details', {
        message: `Migração 0054: Limpeza do sistema. ${count} documentos removidos.`,
        type: 'bulk_delete',
      })
      // Without admin_user set, the frontend fallback logic resolves this as 'Sistema'
      app.save(log)
    } catch (err) {
      console.log('Failed to create audit log in migration', err.message)
    }
  },
  (app) => {
    // Cannot revert deletion
  },
)
