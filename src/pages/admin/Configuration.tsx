import React, { useState } from 'react'
import { useApp } from '@/contexts/AppContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, ShieldAlert } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export default function AdminConfiguration() {
  const { groups, addRequirement } = useApp()
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [newReq, setNewReq] = useState({
    title: '',
    description: '',
    mandatory: true,
    expires: false,
  })
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleSaveRequirement = () => {
    if (!newReq.title) return
    addRequirement(selectedGroup, newReq)
    setIsDialogOpen(false)
    setNewReq({ title: '', description: '', mandatory: true, expires: false })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Regras e Requisitos</h1>
          <p className="text-muted-foreground mt-1">
            Configure os documentos exigidos para cada categoria de stakeholder.
          </p>
        </div>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" /> Novo Grupo
        </Button>
      </div>

      <Accordion
        type="single"
        collapsible
        className="w-full space-y-4"
        defaultValue={groups[0]?.id}
      >
        {groups.map((group) => (
          <AccordionItem
            key={group.id}
            value={group.id}
            className="border bg-card rounded-lg shadow-sm px-4"
          >
            <AccordionTrigger className="hover:no-underline py-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-5 h-5 text-blue-500" />
                <span className="font-semibold text-lg">{group.name}</span>
                <Badge variant="secondary" className="ml-2">
                  {group.requirements.length} Requisitos
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-4">
              <div className="space-y-4">
                {group.requirements.length === 0 ? (
                  <div className="text-center p-6 border border-dashed rounded-lg text-muted-foreground">
                    Nenhum requisito configurado para este grupo.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {group.requirements.map((req) => (
                      <Card key={req.id} className="shadow-none border-border">
                        <CardContent className="p-4 flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{req.title}</h4>
                              {req.mandatory && (
                                <Badge
                                  variant="destructive"
                                  className="bg-rose-100 text-rose-800 border-rose-200"
                                >
                                  Obrigatório
                                </Badge>
                              )}
                              {req.expires && (
                                <Badge
                                  variant="outline"
                                  className="bg-amber-50 text-amber-800 border-amber-200"
                                >
                                  Controla Validade
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{req.description}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <Dialog
                  open={isDialogOpen && selectedGroup === group.id}
                  onOpenChange={(open) => {
                    setIsDialogOpen(open)
                    if (open) setSelectedGroup(group.id)
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="secondary"
                      className="w-full mt-2 border border-dashed border-border"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Adicionar Documento
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Adicionar Requisito</DialogTitle>
                      <DialogDescription>
                        Defina um novo documento para o grupo{' '}
                        <strong className="text-foreground">{group.name}</strong>.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Nome do Documento</Label>
                        <Input
                          id="title"
                          value={newReq.title}
                          onChange={(e) => setNewReq({ ...newReq, title: e.target.value })}
                          placeholder="Ex: Contrato Social"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="desc">Descrição / Instruções</Label>
                        <Input
                          id="desc"
                          value={newReq.description}
                          onChange={(e) => setNewReq({ ...newReq, description: e.target.value })}
                          placeholder="Breve explicação..."
                        />
                      </div>
                      <div className="flex items-center justify-between border rounded-lg p-3">
                        <div className="space-y-0.5">
                          <Label>Documento Obrigatório</Label>
                          <p className="text-xs text-muted-foreground">
                            Bloqueia aprovação do cadastro se ausente.
                          </p>
                        </div>
                        <Switch
                          checked={newReq.mandatory}
                          onCheckedChange={(c) => setNewReq({ ...newReq, mandatory: c })}
                        />
                      </div>
                      <div className="flex items-center justify-between border rounded-lg p-3">
                        <div className="space-y-0.5">
                          <Label>Controlar Validade</Label>
                          <p className="text-xs text-muted-foreground">
                            O sistema alertará quando o documento vencer.
                          </p>
                        </div>
                        <Switch
                          checked={newReq.expires}
                          onCheckedChange={(c) => setNewReq({ ...newReq, expires: c })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleSaveRequirement}>Salvar Requisito</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  )
}
