import pb from '@/lib/pocketbase/client'

export interface Employee {
  id: string
  name: string
  tax_id: string
  role: 'motorista' | 'operador' | 'outros'
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

export const getEmployees = (filter?: string) =>
  pb
    .collection('employees')
    .getFullList<Employee>({ sort: '-created', expand: 'user,forest_area', filter })

export const getEmployee = (id: string) =>
  pb.collection('employees').getOne<Employee>(id, { expand: 'user,forest_area' })

export const createEmployee = (data: Partial<Employee>) =>
  pb.collection('employees').create<Employee>(data)

export const updateEmployee = (id: string, data: Partial<Employee>) =>
  pb.collection('employees').update<Employee>(id, data)

export const deleteEmployee = (id: string) => pb.collection('employees').delete(id)
