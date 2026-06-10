import pb from '@/lib/pocketbase/client'

export interface Supplier {
  id: string
  name: string
  legal_name?: string
  tax_id: string
  email: string
  person_type: 'PF' | 'PJ'
  phone?: string
  address?: string
  external_code?: string
  cep?: string
  municipio?: string
  uf?: string
  floresta_info?: string
  controle_florestal?: string
  created: string
  updated: string
}

export const getSuppliers = (filter?: string) =>
  pb.collection('suppliers').getFullList<Supplier>({ sort: '-created', filter })

export const createSupplier = (data: Partial<Supplier>) =>
  pb.collection('suppliers').create<Supplier>(data)

export const updateSupplier = (id: string, data: Partial<Supplier>) =>
  pb.collection('suppliers').update<Supplier>(id, data)

export const deleteSupplier = (id: string) => pb.collection('suppliers').delete(id)
