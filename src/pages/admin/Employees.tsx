import { useState, useEffect, useCallback } from 'react'
import { getEmployees, Employee } from '@/services/employees'
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
import { formatCPF } from '@/lib/utils'
import { useRealtime } from '@/hooks/use-realtime'

export default function AdminEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [forestAreas, setForestAreas] = useState<ForestArea[]>([])

  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [selectedForest, setSelectedForest] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [emp, sup, forest] = await Promise.all([
        getEmployees(),
        pb.collection('users').getFullList({ filter: 'role="Fornecedor"' }),
        getForestAreas(),
      ])
      setEmployees(emp)
      setSuppliers(sup)
      setForestAreas(forest)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('employees', loadData)

  const filteredEmployees = employees.filter((e) => {
    const matchSupplier = selectedSupplier === 'all' || e.user === selectedSupplier
    const matchForest = selectedForest === 'all' || e.forest_area === selectedForest
    return matchSupplier && matchForest
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Funcionários (Admin)</h1>
          <p className="text-muted-foreground">Gestão e filtro de funcionários cadastrados</p>
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
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Área Florestal</TableHead>
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
            {!loading && filteredEmployees.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            )}
            {filteredEmployees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell className="font-medium">{emp.name}</TableCell>
                <TableCell>{formatCPF(emp.tax_id)}</TableCell>
                <TableCell className="capitalize">{emp.role}</TableCell>
                <TableCell>{emp.expand?.user?.name || emp.expand?.user?.email || '-'}</TableCell>
                <TableCell>{emp.expand?.forest_area?.name || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
