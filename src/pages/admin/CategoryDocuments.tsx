import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { getDocuments } from '@/services/documents'
import { getForestAreas, ForestArea } from '@/services/forest_areas'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { Badge } from '@/components/ui/badge'
import { useRealtime } from '@/hooks/use-realtime'

export default function AdminCategoryDocuments() {
  const { categoryId } = useParams()
  const [documents, setDocuments] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [forestAreas, setForestAreas] = useState<ForestArea[]>([])

  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [selectedForest, setSelectedForest] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [docs, sup, forest] = await Promise.all([
        getDocuments('', 'user,forest_area,definition'),
        pb.collection('users').getFullList({ filter: 'role="Fornecedor"' }),
        getForestAreas(),
      ])
      const categoryDocs = categoryId
        ? docs.filter((d) => d.expand?.definition?.category === categoryId)
        : docs
      setDocuments(categoryDocs)
      setSuppliers(sup)
      setForestAreas(forest)
    } finally {
      setLoading(false)
    }
  }, [categoryId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('documents', loadData)

  const filteredDocs = documents.filter((d) => {
    const matchSupplier = selectedSupplier === 'all' || d.user === selectedSupplier
    const matchForest = selectedForest === 'all' || d.forest_area === selectedForest
    return matchSupplier && matchForest
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Documentos (Admin)</h1>
          <p className="text-muted-foreground">Filtro avançado por origem e localidade</p>
        </div>

        <div className="flex gap-4 items-center bg-muted/50 p-3 rounded-lg border">
          <div className="space-y-1">
            <Label className="text-xs">Filtrar por Fornecedor</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name || s.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Filtrar por Área Florestal</Label>
            <Select value={selectedForest} onValueChange={setSelectedForest}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {forestAreas.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Área Florestal</TableHead>
              <TableHead>Data de Envio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            )}
            {!loading && filteredDocs.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            )}
            {filteredDocs.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">
                  {doc.title || doc.expand?.definition?.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      doc.status === 'Approved'
                        ? 'default'
                        : doc.status === 'Rejected'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {doc.status}
                  </Badge>
                </TableCell>
                <TableCell>{doc.expand?.user?.name || doc.expand?.user?.email || '-'}</TableCell>
                <TableCell>{doc.expand?.forest_area?.name || '-'}</TableCell>
                <TableCell>{new Date(doc.created).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
