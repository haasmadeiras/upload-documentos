import { useEffect, useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, ShieldCheck, AlertTriangle, FileWarning, Search } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'

export default function AdminCompliance() {
  const [loading, setLoading] = useState(true)
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [documents, setDocuments] = useState<any[]>([])
  const [definitions, setDefinitions] = useState<any[]>([])
  const [forestAreas, setForestAreas] = useState<any[]>([])

  const [search, setSearch] = useState('')
  const [forestFilter, setForestFilter] = useState('all')

  const loadData = async () => {
    try {
      const [suppRes, docsRes, defsRes, forestRes] = await Promise.all([
        pb.collection('suppliers').getFullList({ expand: 'forest_area' }),
        pb.collection('documents').getFullList({ expand: 'definition', filter: "supplier != ''" }),
        pb.collection('document_definitions').getFullList({ filter: 'is_mandatory = true' }),
        pb.collection('forest_areas').getFullList(),
      ])
      setSuppliers(suppRes)
      setDocuments(docsRes)
      setDefinitions(defsRes)
      setForestAreas(forestRes)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  useRealtime('suppliers', loadData)
  useRealtime('documents', loadData)
  useRealtime('document_definitions', loadData)

  const complianceData = useMemo(() => {
    return suppliers.map((supplier) => {
      const supplierDefs = definitions.filter(
        (def) =>
          !def.target_person_type ||
          def.target_person_type === 'Both' ||
          def.target_person_type === supplier.person_type,
      )
      const supplierDocs = documents.filter((doc) => doc.supplier === supplier.id)

      let approvedCount = 0
      let criticalCount = 0

      const details = supplierDefs.map((def) => {
        const doc = supplierDocs.find((d) => d.definition === def.id)
        let docStatus = doc ? doc.status : 'Missing'

        if (docStatus === 'Approved') approvedCount++
        if (docStatus === 'Rejected' || docStatus === 'Expired') criticalCount++

        // check expiry
        if (docStatus === 'Approved' && def.validity_days) {
          const expiryDate = new Date(doc.created)
          expiryDate.setDate(expiryDate.getDate() + def.validity_days)
          if (expiryDate < new Date()) {
            docStatus = 'Expired'
            criticalCount++
            approvedCount--
          }
        }
        return { def, doc, docStatus }
      })

      const isCompliant = supplierDefs.length > 0 && approvedCount === supplierDefs.length
      const hasCritical = criticalCount > 0

      return {
        ...supplier,
        isCompliant,
        hasCritical,
        supplierDefs,
        details,
      }
    })
  }, [suppliers, documents, definitions])

  const filteredData = complianceData.filter((s) => {
    if (
      search &&
      !s.name.toLowerCase().includes(search.toLowerCase()) &&
      !s.legal_name?.toLowerCase().includes(search.toLowerCase())
    )
      return false
    if (forestFilter !== 'all' && s.forest_area !== forestFilter) return false
    return true
  })

  const metrics = useMemo(() => {
    const total = complianceData.length
    const compliant = complianceData.filter((s) => s.isCompliant).length
    const critical = complianceData.filter((s) => s.hasCritical).length
    const pendingReviews = documents.filter((d) => d.status === 'Pending Final Approval').length

    return {
      rate: total ? Math.round((compliant / total) * 100) : 0,
      pendingReviews,
      critical,
    }
  }, [complianceData, documents])

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard de Compliance</h1>
        <p className="text-muted-foreground mt-1">
          Monitore o status de conformidade da base de fornecedores.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa de Conformidade
            </CardTitle>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{metrics.rate}%</div>
            <p className="text-xs text-muted-foreground">100% Regular</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revisões Pendentes
            </CardTitle>
            <FileWarning className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{metrics.pendingReviews}</div>
            <p className="text-xs text-muted-foreground">Aguardando Aprovação Final</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fornecedores com Pendências Críticas
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{metrics.critical}</div>
            <p className="text-xs text-muted-foreground">Docs expirados ou rejeitados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listagem de Conformidade por Fornecedor</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor..."
                className="pl-8"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={forestFilter} onValueChange={setForestFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Área Florestal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Áreas</SelectItem>
                {forestAreas.map((fa) => (
                  <SelectItem key={fa.id} value={fa.id}>
                    {fa.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Área Florestal</TableHead>
                <TableHead>Status Geral</TableHead>
                <TableHead>Pendências / Críticos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>{s.expand?.forest_area?.name || 'N/A'}</TableCell>
                  <TableCell>
                    {s.isCompliant ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100/80 border-none">
                        100% Regular
                      </Badge>
                    ) : s.hasCritical ? (
                      <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100/80 border-none">
                        Irregular / Crítico
                      </Badge>
                    ) : (
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100/80 border-none">
                        Pendentes / Em Análise
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {s.details
                        .filter((d: any) => d.docStatus !== 'Approved')
                        .map((d: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-1">
                            <span className="truncate max-w-[200px]">{d.def.name}:</span>
                            <span
                              className={`font-semibold ${d.docStatus === 'Rejected' || d.docStatus === 'Expired' ? 'text-rose-600' : 'text-amber-600'}`}
                            >
                              {d.docStatus}
                            </span>
                          </div>
                        ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
