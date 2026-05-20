migrate(
  (app) => {
    const employees = app.findRecordsByFilter('employees', "tax_id != ''", '', 10000, 0)
    for (const emp of employees) {
      const rawTaxId = emp.getString('tax_id')
      const cleaned = rawTaxId.replace(/\D/g, '')
      if (rawTaxId !== cleaned) {
        emp.set('tax_id', cleaned)
        app.saveNoValidate(emp)
      }
    }
  },
  (app) => {
    // no-op
  },
)
