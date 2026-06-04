import pb from '@/lib/pocketbase/client'

export interface Vehicle {
  id: string
  plate: string
  model: string
  brand: string
  year: number
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

export const getVehicles = (filter?: string) =>
  pb
    .collection('vehicles')
    .getFullList<Vehicle>({ sort: '-created', expand: 'user,forest_area', filter })
export const createVehicle = (data: Partial<Vehicle>) =>
  pb.collection('vehicles').create<Vehicle>(data)
export const updateVehicle = (id: string, data: Partial<Vehicle>) =>
  pb.collection('vehicles').update<Vehicle>(id, data)
export const deleteVehicle = (id: string) => pb.collection('vehicles').delete(id)
