import pb from '@/lib/pocketbase/client'
import { DocumentCategory } from './document_categories'

export interface DocumentDefinition {
  id: string
  category: string
  name: string
  is_mandatory: boolean
  validity_days: number
  max_size_mb?: number
  is_vide_documento?: boolean
  allowed_formats: string
  target_person_type?: 'PF' | 'PJ' | 'Both'
  target_role?: 'all' | 'motorista' | 'operador' | 'outros'
  ai_validation_instructions?: string
  created: string
  updated: string
  expand?: {
    category?: DocumentCategory
  }
}

export const getDocumentDefinitions = () =>
  pb.collection('document_definitions').getFullList<DocumentDefinition>({
    sort: 'name',
    expand: 'category',
  })

export const createDocumentDefinition = (data: Partial<DocumentDefinition>) =>
  pb.collection('document_definitions').create<DocumentDefinition>(data)

export const updateDocumentDefinition = (id: string, data: Partial<DocumentDefinition>) =>
  pb.collection('document_definitions').update<DocumentDefinition>(id, data)

export const deleteDocumentDefinition = (id: string) =>
  pb.collection('document_definitions').delete(id)
