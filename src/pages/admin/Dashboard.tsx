import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import pb from '@/lib/pocketbase/client'
import { getForestAreas, ForestArea } from '@/services/forest_areas'
import { useRealtime } from '@/hooks/use-realtime'
import { Users, Truck, FileText, Map as MapIcon } from 'lucide-react'

import { useAuth } from '@/hooks/use-auth'

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState({ employees: 0, vehicles: 0, documents: 0, forests: 0 })
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [forestAreas, setForestAreas] = useState<ForestArea[]>([])

  const [selectedSupplier, setSelectedSupplier] = useState<string>('all')
  const [selectedForest, setSelectedForest] = useState<string>('all')

  useEffect(() => {
    Promise.all([
      pb.collection('users').getFullList({ filter: 'role="Fornecedor"' }),
      getForestAreas(),
    ]).then(([s, f]) => {
      setSuppliers(s)
      setForestAreas(f)
    })
  }, [])

  const fetchStats = useCallback(async () => {
    const filters = []
    if (selectedSupplier !== 'all') filters.push(`user="${selectedSupplier}"`)
    if (selectedForest !== 'all') filters.push(`forest_area="${selectedForest}"`)

    const filterStr = filters.join(' && ')
    const options = filterStr ? { filter: filterStr } : undefined

    try {
      const [emp, veh, doc, fora] = await Promise.all([
        pb.collection('employees').getList(1, 1, options),
        pb.collection('vehicles').getList(1, 1, options),
        pb.collection('documents').getList(1, 1, options),
        pb
          .collection('forest_areas')
          .getList(
            1,
            1,
            selectedSupplier !== 'all' ? { filter: `user="${selectedSupplier}"` } : undefined,
          ),
      ])

      setStats({
        employees: emp.totalItems,
        vehicles: veh.totalItems,
        documents: doc.totalItems,
        forests: fora.totalItems,
      })
    } catch (err) {
      console.error(err)
    }
  }, [selectedSupplier, selectedForest])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useRealtime('employees', fetchStats)
  useRealtime('vehicles', fetchStats)
  useRealtime('documents', fetchStats)

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Gestão</h1>
          <p className="text-muted-foreground">Visão geral do sistema e cadastros</p>
        </div>

        <div className="flex gap-4 items-center bg-muted/50 p-3 rounded-lg border">
          <div className="space-y-1">
            <Label className="text-xs">Filtrar por Fornecedor</Label>
            <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
              <SelectTrigger className="w-[200px] bg-background">
                <SelectValue placeholder="Todos fornecedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos fornecedores</SelectItem>
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
                <SelectValue placeholder="Todas áreas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas áreas</SelectItem>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Funcionários
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.employees}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Veículos
            </CardTitle>
            <Truck className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.vehicles}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Documentos
            </CardTitle>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.documents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Áreas Florestais
            </CardTitle>
            <MapIcon className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.forests}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
