// @deps xlsx@0.18.5
routerAdd(
  'POST',
  '/backend/v1/suppliers/parse-excel',
  (e) => {
    const xlsx = require('xlsx')
    const body = e.requestInfo().body || {}
    const base64Data = body.data

    if (!base64Data) {
      return e.badRequestError('Arquivo não enviado')
    }

    let workbook
    try {
      workbook = xlsx.read(base64Data, { type: 'base64' })
    } catch (err) {
      return e.badRequestError('O arquivo enviado não é uma planilha Excel válida')
    }

    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const rows = xlsx.utils.sheet_to_json(worksheet, { defval: '' })

    return e.json(200, { rows: rows })
  },
  $apis.requireAuth(),
)
