import pb from '@/lib/pocketbase/client'

export const getDocuments = async () => {
  return await pb.collection('documents').getFullList({
    sort: '-created',
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
