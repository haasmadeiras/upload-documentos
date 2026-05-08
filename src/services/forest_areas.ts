import pb from '@/lib/pocketbase/client'

export interface ForestArea {
  id: string
  name: string
  registration_number: string
  location: string
  created: string
  updated: string
}

export const getForestAreas = () =>
  pb.collection('forest_areas').getFullList<ForestArea>({ sort: '-created' })
export const createForestArea = (data: Partial<ForestArea>) =>
  pb.collection('forest_areas').create<ForestArea>(data)
export const updateForestArea = (id: string, data: Partial<ForestArea>) =>
  pb.collection('forest_areas').update<ForestArea>(id, data)
export const deleteForestArea = (id: string) => pb.collection('forest_areas').delete(id)
