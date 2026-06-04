import pb from '@/lib/pocketbase/client'

export interface Contract {
  id: string
  contract_number: string
  description: string
  start_date: string
  end_date: string
  user: string
  forest_area: string
  created: string
  updated: string
  expand?: {
    user?: {
      name: string
      email: string
    }
    forest_area?: {
      name: string
    }
  }
}

export const getContracts = (filter?: string) =>
  pb
    .collection('contracts')
    .getFullList<Contract>({ sort: '-created', expand: 'user,forest_area', filter })
export const createContract = (data: Partial<Contract>) =>
  pb.collection('contracts').create<Contract>(data)
export const updateContract = (id: string, data: Partial<Contract>) =>
  pb.collection('contracts').update<Contract>(id, data)
export const deleteContract = (id: string) => pb.collection('contracts').delete(id)
