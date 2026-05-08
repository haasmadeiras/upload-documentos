import pb from '@/lib/pocketbase/client'

export interface Vehicle {
  id: string
  plate: string
  model: string
  brand: string
  year: number
  created: string
  updated: string
}

export const getVehicles = () =>
  pb.collection('vehicles').getFullList<Vehicle>({ sort: '-created' })
export const createVehicle = (data: Partial<Vehicle>) =>
  pb.collection('vehicles').create<Vehicle>(data)
export const updateVehicle = (id: string, data: Partial<Vehicle>) =>
  pb.collection('vehicles').update<Vehicle>(id, data)
export const deleteVehicle = (id: string) => pb.collection('vehicles').delete(id)
