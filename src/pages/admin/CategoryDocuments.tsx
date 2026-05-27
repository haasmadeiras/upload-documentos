import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { FileDown, Loader2 } from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent } from '@/components/ui/card'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'

export default function CategoryDocuments() {
  const { categoryId } = useParams()
  const [documents, setDocuments] = useState<any[]>([])
  const [category, setCategory] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const loadData = async () => {
    if (!categoryId) return
    try {
      setLoading(true)
      const cat = await pb.collection('document_categories').getOne(categoryId)
      setCategory(cat)

      const docs = await pb.collection('documents').getFullList({
        filter: `definition.category = "${categoryId}"`,
        sort: '-created',
        expand: 'definition,employee,vehicle,contract,forest_area',
      })
      setDocuments(docs)
    } catch (err) {
      toast({
        title: 'Erro ao carregar documentos',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [categoryId])

  useRealtime('documents', () => {
    loadData()
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pendente
          </Badge>
        )
      case 'Approved':
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Aprovado
          </Badge>
        )
      case 'Rejected':
        return <Badge variant="destructive">Rejeitado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getRelatedEntity = (doc: any) => {
    if (doc.expand?.employee) return `Funcionário: ${doc.expand.employee.name}`
    if (doc.expand?.vehicle)
      return `Veículo: ${doc.expand.vehicle.plate} - ${doc.expand.vehicle.model}`
    if (doc.expand?.contract) return `Contrato: ${doc.expand.contract.contract_number}`
    if (doc.expand?.forest_area) return `Floresta: ${doc.expand.forest_area.name}`
    return 'Fornecedor'
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Documentos: {category?.name}</h2>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entidade Relacionada</TableHead>
                <TableHead>Data de Upload</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    Nenhum documento encontrado para esta categoria.
                  </TableCell>
                </TableRow>
              ) : (
                documents.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                    <TableCell>{getRelatedEntity(doc)}</TableCell>
                    <TableCell>{format(new Date(doc.created), 'dd/MM/yyyy')}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={pb.files.getURL(doc, doc.file)}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <FileDown className="mr-2 h-4 w-4" />
                          Download
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
