migrate(
  (app) => {
    try {
      const defs = app.findRecordsByFilter('document_definitions', "name ~ 'FGTS'", '', 100, 0)
      for (const def of defs) {
        def.set('allowed_formats', '.pdf')
        app.save(def)
      }
    } catch (_) {
      // Ignore if collection doesn't exist or query fails
    }
  },
  (app) => {
    try {
      const defs = app.findRecordsByFilter('document_definitions', "name ~ 'FGTS'", '', 100, 0)
      for (const def of defs) {
        def.set('allowed_formats', '')
        app.save(def)
      }
    } catch (_) {}
  },
)
