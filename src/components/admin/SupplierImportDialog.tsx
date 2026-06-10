import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Download, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'
import * as XLSX from 'xlsx'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SupplierImportDialog({ open, onOpenChange, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [stats, setStats] = useState<{
    created: number
    updated: number
    skipped: number
    total: number
    forestsCreated: number
    forestsLinked: number
    errors: string[]
  } | null>(null)

  const downloadTemplate = () => {
    const headers = [
      'Código',
      'Razão Soc/Nome',
      'Fantasia/Apelido',
      'Endereço',
      'CEP',
      'Município',
      'UF',
      'Floresta',
      'Controle Florestal',
      'CNPJ/CPF',
      'E-mail',
    ]
    const worksheet = XLSX.utils.aoa_to_sheet([headers])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo')
    XLSX.writeFile(workbook, 'modelo_fornecedores.xlsx')
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setProgress(0)
    setStats(null)

    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[firstSheetName]
      const rowsRaw = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][]

      const normalizeHeader = (h: any) =>
        h
          ? String(h)
              .toLowerCase()
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .trim()
          : ''

      let headerIdx = -1
      let headers: string[] = []

      for (let i = 0; i < rowsRaw.length; i++) {
        const row = rowsRaw[i]
        if (!Array.isArray(row)) continue
        const rowString = row.map(normalizeHeader).join(' ')
        if (
          rowString.includes('codigo') &&
          (rowString.includes('cnpj') || rowString.includes('cpf') || rowString.includes('email'))
        ) {
          headerIdx = i
          headers = row.map(normalizeHeader)
          break
        }
      }

      if (headerIdx === -1) {
        for (let i = 0; i < rowsRaw.length; i++) {
          if (Array.isArray(rowsRaw[i]) && rowsRaw[i].length > 0 && rowsRaw[i].some(Boolean)) {
            headerIdx = i
            headers = rowsRaw[i].map(normalizeHeader)
            break
          }
        }
      }

      if (headers.length === 0) throw new Error('O arquivo está vazio ou sem dados válidos')

      const colMap = {
        codigo: headers.findIndex((h) => h === 'codigo'),
        razao: headers.findIndex((h) => h.includes('razao') || h.includes('nome')),
        fantasia: headers.findIndex((h) => h.includes('fantasia') || h.includes('apelido')),
        endereco: headers.findIndex((h) => h === 'endereco'),
        cep: headers.findIndex((h) => h === 'cep'),
        municipio: headers.findIndex((h) => h === 'municipio'),
        uf: headers.findIndex((h) => h === 'uf'),
        floresta: headers.findIndex((h) => h === 'floresta'),
        controle: headers.findIndex((h) => h.includes('controle')),
        doc: headers.findIndex((h) => h.includes('cnpj') || h.includes('cpf')),
        email: headers.findIndex((h) => h.includes('email') || h.includes('e-mail')),
      }

      const isExcel =
        file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')
      const extStr = isExcel ? '.xlsx' : '.csv'

      if (colMap.codigo === -1)
        throw new Error(`Erro: Coluna Código não localizada no arquivo ${extStr}`)
      if (colMap.razao === -1 && colMap.fantasia === -1)
        throw new Error(`Erro: Colunas de Nome/Razão não localizadas no arquivo ${extStr}`)
      if (colMap.doc === -1)
        throw new Error(`Erro: Coluna CNPJ/CPF não localizada no arquivo ${extStr}`)
      if (colMap.email === -1)
        throw new Error(`Erro: Coluna E-mail não localizada no arquivo ${extStr}`)

      const rows: Record<string, string>[] = []
      for (let i = headerIdx + 1; i < rowsRaw.length; i++) {
        const row = rowsRaw[i]
        if (!Array.isArray(row) || row.length === 0 || row.every((val) => !val)) continue

        rows.push({
          codigo: colMap.codigo !== -1 ? String(row[colMap.codigo] || '').trim() : '',
          razao: colMap.razao !== -1 ? String(row[colMap.razao] || '').trim() : '',
          fantasia: colMap.fantasia !== -1 ? String(row[colMap.fantasia] || '').trim() : '',
          endereco: colMap.endereco !== -1 ? String(row[colMap.endereco] || '').trim() : '',
          cep: colMap.cep !== -1 ? String(row[colMap.cep] || '').trim() : '',
          municipio: colMap.municipio !== -1 ? String(row[colMap.municipio] || '').trim() : '',
          uf: colMap.uf !== -1 ? String(row[colMap.uf] || '').trim() : '',
          floresta: colMap.floresta !== -1 ? String(row[colMap.floresta] || '').trim() : '',
          controle: colMap.controle !== -1 ? String(row[colMap.controle] || '').trim() : '',
          doc: colMap.doc !== -1 ? String(row[colMap.doc] || '').trim() : '',
          email: colMap.email !== -1 ? String(row[colMap.email] || '').trim() : '',
        })
      }

      let created = 0
      let updated = 0
      let skipped = 0
      let forestsCreated = 0
      let forestsLinked = 0
      const errors: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rawTaxId = String(row.doc || '')
        const taxId = rawTaxId.replace(/\D/g, '')

        if (!taxId) {
          skipped++
          continue
        }

        if (taxId.length !== 11 && taxId.length !== 14) {
          errors.push(`Linha ${i + 2}: Documento inválido (${rawTaxId})`)
          skipped++
        } else {
          const email = String(row.email || '').trim()
          if (!email) {
            errors.push(`Linha ${i + 2}: E-mail vazio para o documento ${taxId}`)
            skipped++
          } else {
            try {
              const personType = taxId.length === 14 ? 'PJ' : 'PF'
              const razao = String(row.razao || '').trim()
              const fantasia = String(row.fantasia || '').trim()
              const forestName = String(row.floresta || '').trim()

              const endereco = String(row.endereco || '').trim()
              const cep = String(row.cep || '').trim()
              const municipio = String(row.municipio || '').trim()
              const uf = String(row.uf || '').trim()

              const fullAddressArr = []
              if (endereco) fullAddressArr.push(endereco)
              if (municipio || uf)
                fullAddressArr.push(`${municipio}${municipio && uf ? ' - ' : ''}${uf}`)
              if (cep) fullAddressArr.push(`CEP: ${cep}`)
              const locationStr = fullAddressArr.join(', ')

              const payload: any = {
                tax_id: taxId,
                person_type: personType,
                email,
                name: razao || fantasia || 'Sem Nome',
                legal_name: fantasia,
                address: endereco,
                cep,
                municipio,
                uf,
                floresta_info: forestName,
                controle_florestal: String(row.controle || '').trim(),
                external_code: String(row.codigo || '').trim(),
              }

              let supplierId = ''
              try {
                const existing = await pb
                  .collection('suppliers')
                  .getFirstListItem(`tax_id="${taxId}"`)
                await pb.collection('suppliers').update(existing.id, payload)
                supplierId = existing.id
                updated++
              } catch {
                const newSupplier = await pb.collection('suppliers').create(payload)
                supplierId = newSupplier.id
                created++
              }

              if (forestName && supplierId) {
                try {
                  const activeForests = await pb.collection('forest_areas').getFullList({
                    filter: `supplier="${supplierId}" && is_active=true`,
                  })
                  const currentActive = activeForests[0]

                  let newActiveId = currentActive?.id

                  if (currentActive) {
                    if (currentActive.name.toLowerCase().trim() !== forestName.toLowerCase()) {
                      await pb.collection('forest_areas').update(currentActive.id, {
                        is_active: false,
                        end_date: new Date().toISOString(),
                      })
                      const newForest = await pb.collection('forest_areas').create({
                        name: forestName,
                        location: locationStr,
                        supplier: supplierId,
                        start_date: new Date().toISOString(),
                        is_active: true,
                      })
                      newActiveId = newForest.id
                      forestsCreated++
                      forestsLinked++
                    }
                  } else {
                    const newForest = await pb.collection('forest_areas').create({
                      name: forestName,
                      location: locationStr,
                      supplier: supplierId,
                      start_date: new Date().toISOString(),
                      is_active: true,
                    })
                    newActiveId = newForest.id
                    forestsCreated++
                    forestsLinked++
                  }

                  if (newActiveId) {
                    await pb
                      .collection('suppliers')
                      .update(supplierId, { forest_area: newActiveId })
                  }
                } catch (err: any) {
                  errors.push(`Linha ${i + 2}: Erro ao vincular Floresta - ${err.message}`)
                }
              } else if (!forestName && supplierId) {
                errors.push(`Linha ${i + 2}: Aviso - Nenhuma floresta informada para ${taxId}`)
              }
            } catch (err: any) {
              errors.push(`Linha ${i + 2}: Erro ao salvar - ${err.message || 'Erro interno'}`)
              skipped++
            }
          }
        }

        if (i % 5 === 0 || i === rows.length - 1) {
          setProgress(Math.round(((i + 1) / rows.length) * 100))
        }
      }

      setStats({
        created,
        updated,
        skipped,
        total: rows.length,
        forestsCreated,
        forestsLinked,
        errors,
      })
      toast.success(`Importação concluída: ${created} criados, ${updated} atualizados.`)
      onSuccess()
    } catch (error: any) {
      toast.error(error.message || 'Erro ao processar o arquivo')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!importing) {
          onOpenChange(o)
          if (!o) {
            setFile(null)
            setStats(null)
            setProgress(0)
          }
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Importar Fornecedores</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Importe fornecedores via arquivo Excel (.xlsx) ou CSV.
          </div>
          <Button variant="link" className="p-0 h-auto" onClick={downloadTemplate}>
            <Download className="mr-2 w-4 h-4" /> Baixar modelo
          </Button>

          {!importing && !stats && (
            <Input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          )}

          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importando...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {stats && (
            <div className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Importação Concluída</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 text-sm list-disc list-inside">
                    <li>Fornecedores Criados: {stats.created}</li>
                    <li>Fornecedores Atualizados: {stats.updated}</li>
                    <li>Áreas Florestais Criadas: {stats.forestsCreated}</li>
                    <li>Áreas Florestais Vinculadas: {stats.forestsLinked}</li>
                    <li>Ignorados/Erros: {stats.skipped}</li>
                  </ul>
                </AlertDescription>
              </Alert>
              {stats.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto bg-muted p-2 rounded text-xs text-destructive">
                  {stats.errors.map((e, i) => (
                    <div key={i}>{e}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            {!importing && !stats && (
              <Button disabled={!file} onClick={handleImport}>
                Iniciar Importação
              </Button>
            )}
            {stats && <Button onClick={() => onOpenChange(false)}>Concluir</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
