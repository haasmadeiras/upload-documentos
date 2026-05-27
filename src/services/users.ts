import pb from '@/lib/pocketbase/client'

export interface User {
  id: string
  email: string
  name: string
  isAdmin: boolean
  person_type: 'PF' | 'PJ'
  tax_id: string
  role: 'Admin' | 'Colaborador' | 'Fornecedor'
  phone?: string
  legal_name?: string
  address?: string
  created: string
  updated: string
}

export const getUsers = (filter?: string) =>
  pb.collection('users').getFullList<User>({ sort: '-created', filter })
export const createUser = (data: Partial<User> & { password?: string; passwordConfirm?: string }) =>
  pb.collection('users').create<User>(data)
export const updateUser = (id: string, data: Partial<User>) =>
  pb.collection('users').update<User>(id, data)
export const deleteUser = (id: string) => pb.collection('users').delete(id)
