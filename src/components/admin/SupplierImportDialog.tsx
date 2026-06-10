import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Download, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import pb from '@/lib/pocketbase/client'

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
    success: number
    skipped: number
    total: number
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
    const csv = '\uFEFF' + headers.join(';') + '\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'modelo_fornecedores.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleImport = async () => {
    if (!file) return
    setImporting(true)
    setProgress(0)
    setStats(null)

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => resolve((e.target?.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      const parseRes = await pb.send('/backend/v1/suppliers/parse-excel', {
        method: 'POST',
        body: JSON.stringify({ data: base64 }),
      })

      const rows = parseRes.rows
      if (!rows || rows.length === 0) throw new Error('A planilha está vazia')

      const reqCols = [
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

      for (const col of reqCols) {
        if (!(col in rows[0]))
          throw new Error(`Coluna '${col}' não encontrada. Verifique o modelo.`)
      }

      let success = 0
      let skipped = 0
      const errors: string[] = []

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        const rawTaxId = String(row['CNPJ/CPF'] || '')
        const taxId = rawTaxId.replace(/\D/g, '')

        if (!taxId) continue

        if (taxId.length !== 11 && taxId.length !== 14) {
          errors.push(`Linha ${i + 2}: Documento inválido (${rawTaxId})`)
          skipped++
        } else {
          const email = String(row['E-mail'] || '').trim()
          if (!email) {
            errors.push(`Linha ${i + 2}: E-mail vazio para o documento ${taxId}`)
            skipped++
          } else {
            try {
              const personType = taxId.length === 14 ? 'PJ' : 'PF'
              const name = String(row['Fantasia/Apelido'] || '').trim()
              const legalName = String(row['Razão Soc/Nome'] || '').trim()
              const address = [row['Endereço'], row['Município'], row['UF'], row['CEP']]
                .filter(Boolean)
                .join(' - ')
              const externalCode = String(row['Código'] || '').trim()

              const payload = {
                tax_id: taxId,
                person_type: personType,
                email,
                name: name || legalName || 'Sem Nome',
                legal_name: legalName,
                address,
                external_code: externalCode,
              }

              try {
                const existing = await pb
                  .collection('suppliers')
                  .getFirstListItem(`tax_id="${taxId}"`)
                await pb.collection('suppliers').update(existing.id, payload)
              } catch {
                await pb.collection('suppliers').create(payload)
              }
              success++
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

      setStats({ success, skipped, total: rows.length, errors })
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
            Importe fornecedores via Excel (.xlsx, .xls) ou CSV.
          </div>
          <Button variant="link" className="p-0 h-auto" onClick={downloadTemplate}>
            <Download className="mr-2 w-4 h-4" /> Baixar modelo
          </Button>

          {!importing && !stats && (
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
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
                    <li>Sucesso: {stats.success} (atualizados/criados)</li>
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
