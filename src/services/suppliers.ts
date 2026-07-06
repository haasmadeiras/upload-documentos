import pb from '@/lib/pocketbase/client'

export interface Supplier {
  id: string
  name: string
  legal_name?: string
  tax_id: string
  email: string
  person_type: 'PF' | 'PJ'
  supplier_type?: 'MATRIZ' | 'FILIAL'
  parent_supplier?: string | string[]
  phone?: string
  address?: string
  external_code?: string
  cep?: string
  municipio?: string
  uf?: string
  forest_area?: string[] | string
  floresta_info?: string
  controle_florestal?: string
  created: string
  updated: string
  expand?: {
    forest_area?:
      | {
          id: string
          name: string
        }[]
      | { id: string; name: string }
    parent_supplier?: {
      id: string
      name: string
      supplier_type?: string
    }
  }
}

export const getCorporateGroupUserIds = async (supplierId: string): Promise<string[]> => {
  const supplier = await pb.collection('suppliers').getOne<Supplier>(supplierId)
  const supplierIds = [supplierId]

  const sType = supplier.supplier_type || 'MATRIZ'

  if (sType === 'MATRIZ') {
    const filiais = await pb.collection('suppliers').getFullList({
      filter: `parent_supplier = "${supplierId}"`,
    })
    supplierIds.push(...filiais.map((f) => f.id))
  } else if (sType === 'FILIAL') {
    const parentId = Array.isArray(supplier.parent_supplier)
      ? supplier.parent_supplier[0]
      : supplier.parent_supplier
    if (parentId) supplierIds.push(parentId)
  }

  const uniqueIds = Array.from(new Set(supplierIds))
  const filterStr = uniqueIds.map((id) => `supplier = "${id}"`).join(' || ')
  const users = await pb.collection('users').getFullList({ filter: filterStr })

  return users.map((u) => u.id)
}

export const getSuppliers = (filter?: string) =>
  pb
    .collection('suppliers')
    .getFullList<Supplier>({ sort: '-created', expand: 'forest_area', filter })

export const createSupplier = (data: Partial<Supplier>) =>
  pb.collection('suppliers').create<Supplier>(data)

export const updateSupplier = (id: string, data: Partial<Supplier>) =>
  pb.collection('suppliers').update<Supplier>(id, data)

export const deleteSupplier = (id: string) => pb.collection('suppliers').delete(id)
