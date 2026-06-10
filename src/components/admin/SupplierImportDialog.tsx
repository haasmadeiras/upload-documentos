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

const splitCSV = (str: string, sep: string) => {
  const result: string[] = []
  let inQuotes = false
  let cur = ''
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === sep && !inQuotes) {
      result.push(cur)
      cur = ''
    } else {
      cur += char
    }
  }
  result.push(cur)
  return result
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
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = (e) => {
          const result = e.target?.result
          if (typeof result === 'string') {
            resolve(result)
          } else {
            reject(new Error('Falha ao ler o arquivo'))
          }
        }
        reader.onerror = reject
        reader.readAsText(file)
      })

      const lines = text.split(/\r?\n/).filter((line) => line.trim() !== '')
      if (lines.length < 2) throw new Error('O arquivo está vazio ou sem dados válidos')

      const normalizeHeader = (h: string) =>
        h
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim()

      let headerIdx = 0
      let headers: string[] = []
      let delimiter = ';'

      for (let i = 0; i < lines.length; i++) {
        const lineNorm = normalizeHeader(lines[i])
        if (
          lineNorm.includes('codigo') &&
          (lineNorm.includes('cnpj') || lineNorm.includes('cpf') || lineNorm.includes('email'))
        ) {
          headerIdx = i
          delimiter = lines[i].includes(';') ? ';' : ','
          headers = splitCSV(lines[i], delimiter).map(normalizeHeader)
          break
        }
      }

      if (headers.length === 0) {
        headerIdx = 0
        delimiter = lines[0].includes(';') ? ';' : ','
        headers = splitCSV(lines[0], delimiter).map(normalizeHeader)
      }

      const colMap = {
        codigo: headers.findIndex((h) => h === 'codigo'),
        razao: headers.findIndex((h) => h.includes('razao')),
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

      if (colMap.codigo === -1)
        throw new Error('Erro: Coluna Código não localizada no arquivo Excel.')
      if (colMap.fantasia === -1)
        throw new Error('Erro: Coluna Fantasia/Apelido não localizada no arquivo Excel.')
      if (colMap.doc === -1)
        throw new Error('Erro: Coluna CNPJ/CPF não localizada no arquivo Excel.')
      if (colMap.email === -1)
        throw new Error('Erro: Coluna E-mail não localizada no arquivo Excel.')

      const rows: Record<string, string>[] = []
      for (let i = headerIdx + 1; i < lines.length; i++) {
        const values = splitCSV(lines[i], delimiter).map((v) =>
          v.trim().replace(/^["']+|["']+$/g, ''),
        )
        rows.push({
          codigo: colMap.codigo !== -1 ? values[colMap.codigo] : '',
          razao: colMap.razao !== -1 ? values[colMap.razao] : '',
          fantasia: colMap.fantasia !== -1 ? values[colMap.fantasia] : '',
          endereco: colMap.endereco !== -1 ? values[colMap.endereco] : '',
          cep: colMap.cep !== -1 ? values[colMap.cep] : '',
          municipio: colMap.municipio !== -1 ? values[colMap.municipio] : '',
          uf: colMap.uf !== -1 ? values[colMap.uf] : '',
          floresta: colMap.floresta !== -1 ? values[colMap.floresta] : '',
          controle: colMap.controle !== -1 ? values[colMap.controle] : '',
          doc: colMap.doc !== -1 ? values[colMap.doc] : '',
          email: colMap.email !== -1 ? values[colMap.email] : '',
        })
      }

      let success = 0
      let skipped = 0
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
              const name = String(row.fantasia || '').trim()
              const legalName = String(row.razao || '').trim()

              const payload = {
                tax_id: taxId,
                person_type: personType,
                email,
                name: name || legalName || 'Sem Nome',
                legal_name: legalName,
                address: String(row.endereco || '').trim(),
                cep: String(row.cep || '').trim(),
                municipio: String(row.municipio || '').trim(),
                uf: String(row.uf || '').trim(),
                floresta_info: String(row.floresta || '').trim(),
                controle_florestal: String(row.controle || '').trim(),
                external_code: String(row.codigo || '').trim(),
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
      toast.success(`${success} fornecedores importados com sucesso!`)
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
          <div className="text-sm text-muted-foreground">Importe fornecedores via arquivo CSV.</div>
          <Button variant="link" className="p-0 h-auto" onClick={downloadTemplate}>
            <Download className="mr-2 w-4 h-4" /> Baixar modelo
          </Button>

          {!importing && !stats && (
            <Input
              type="file"
              accept=".csv"
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
