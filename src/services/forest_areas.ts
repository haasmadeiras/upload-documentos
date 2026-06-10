import pb from '@/lib/pocketbase/client'

export interface ForestArea {
  id: string
  name: string
  registration_number: string
  location: string
  user: string
  supplier?: string
  start_date?: string
  end_date?: string
  is_active?: boolean
  created: string
  updated: string
  expand?: {
    user?: {
      name: string
      email: string
    }
    supplier?: {
      name: string
    }
  }
}

export const getForestAreas = (filter?: string) =>
  pb
    .collection('forest_areas')
    .getFullList<ForestArea>({ sort: '-created', expand: 'user', filter })
export const createForestArea = (data: Partial<ForestArea>) =>
  pb.collection('forest_areas').create<ForestArea>(data)
export const updateForestArea = (id: string, data: Partial<ForestArea>) =>
  pb.collection('forest_areas').update<ForestArea>(id, data)
export const deleteForestArea = (id: string) => pb.collection('forest_areas').delete(id)
