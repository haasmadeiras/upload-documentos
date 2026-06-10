migrate(
  (app) => {
    const records = app.findRecordsByFilter('document_definitions', '1=1', '', 1000, 0)
    for (const record of records) {
      let formats = record.getString('allowed_formats') || ''
      if (!formats) {
        record.set('allowed_formats', 'pdf, jpg, png')
        app.save(record)
        continue
      }

      const formatsList = formats.split(',').map((f) => f.trim().toLowerCase().replace(/^\./, ''))
      if (!formatsList.includes('pdf')) {
        formatsList.push('pdf')
        record.set('allowed_formats', formatsList.join(', '))
        app.save(record)
      }
    }
  },
  (app) => {
    // Reverting would require knowing the exact previous state,
    // which is not possible without an external backup.
    // Leave empty to maintain idempotency.
  },
)
