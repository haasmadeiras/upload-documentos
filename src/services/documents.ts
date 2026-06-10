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
  const definition = formData.get('definition') as string | null
  const user = formData.get('user') as string | null

  if (definition && user) {
    const employee = formData.get('employee') as string | null
    const vehicle = formData.get('vehicle') as string | null
    const contract = formData.get('contract') as string | null
    const forest_area = formData.get('forest_area') as string | null
    const supplier = formData.get('supplier') as string | null

    let filter = `definition = "${definition}" && user = "${user}"`
    if (employee) filter += ` && employee = "${employee}"`
    if (vehicle) filter += ` && vehicle = "${vehicle}"`
    if (contract) filter += ` && contract = "${contract}"`
    if (forest_area) filter += ` && forest_area = "${forest_area}"`
    if (supplier) filter += ` && supplier = "${supplier}"`

    try {
      const existing = await pb.collection('documents').getFullList({ filter })
      for (const doc of existing) {
        await pb.collection('documents').delete(doc.id)
      }
    } catch (e) {
      console.error('Error removing previous document', e)
    }
  }

  return await pb.collection('documents').create(formData)
}

export const downloadDocument = async (doc: any) => {
  try {
    const url = pb.files.getUrl(doc, doc.file)
    const response = await fetch(url)
    const blob = await response.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = doc.file
    document.body.appendChild(a)
    a.click()
    window.URL.revokeObjectURL(downloadUrl)
    document.body.removeChild(a)
  } catch (error) {
    console.error('Error downloading file:', error)
    const a = document.createElement('a')
    a.href = pb.files.getUrl(doc, doc.file)
    a.target = '_blank'
    a.download = doc.file
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
}

export const updateDocument = async (id: string, data: any) => {
  return await pb.collection('documents').update(id, data)
}

export const deleteDocument = async (id: string) => {
  return await pb.collection('documents').delete(id)
}
