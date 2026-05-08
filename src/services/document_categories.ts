import pb from '@/lib/pocketbase/client'

export interface DocumentCategory {
  id: string
  name: string
  created: string
  updated: string
}

export const getDocumentCategories = () =>
  pb.collection('document_categories').getFullList<DocumentCategory>({ sort: 'name' })
