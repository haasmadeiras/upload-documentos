import pb from '@/lib/pocketbase/client'

export const getDocuments = async (filter?: string, expand?: string) => {
  return await pb.collection('documents').getFullList({
    sort: '-created',
    filter,
    expand,
  })
}

export const getDocument = async (id: string) => {
  return await pb.collection('documents').getOne(id)
}

export const createDocument = async (formData: FormData) => {
  return await pb.collection('documents').create(formData)
}

export const updateDocument = async (id: string, formData: FormData) => {
  return await pb.collection('documents').update(id, formData)
}

export const deleteDocument = async (id: string) => {
  return await pb.collection('documents').delete(id)
}
