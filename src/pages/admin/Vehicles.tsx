import { useState, useEffect, useCallback } from 'react'
import { getVehicles, Vehicle } from '@/services/vehicles'
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
import { useRealtime } from '@/hooks/use-realtime'

export default function AdminVehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [forestAreas, setForestAreas] = useState<ForestArea[]>([])

  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [selectedForest, setSelectedForest] = useState<string>('all')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [veh, sup, forest] = await Promise.all([
        getVehicles(),
        pb.collection('users').getFullList({ filter: 'role="Fornecedor"' }),
        getForestAreas(),
      ])
      setVehicles(veh)
      setSuppliers(sup)
      setForestAreas(forest)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useRealtime('vehicles', loadData)

  const filteredVehicles = vehicles.filter((v) => {
    const matchSupplier = selectedSupplier === 'all' || v.user === selectedSupplier
    const matchForest = selectedForest === 'all' || v.forest_area === selectedForest
    return matchSupplier && matchForest
  })

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Veículos (Admin)</h1>
          <p className="text-muted-foreground">Gestão e filtro de veículos cadastrados</p>
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
              <TableHead>Placa</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Marca / Ano</TableHead>
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
            {!loading && filteredVehicles.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Nenhum registro encontrado
                </TableCell>
              </TableRow>
            )}
            {filteredVehicles.map((veh) => (
              <TableRow key={veh.id}>
                <TableCell className="font-medium">{veh.plate}</TableCell>
                <TableCell>{veh.model}</TableCell>
                <TableCell>
                  {veh.brand} {veh.year ? `/ ${veh.year}` : ''}
                </TableCell>
                <TableCell>{veh.expand?.user?.name || veh.expand?.user?.email || '-'}</TableCell>
                <TableCell>{veh.expand?.forest_area?.name || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
