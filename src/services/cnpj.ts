import pb from '@/lib/pocketbase/client'

export interface CnpjLookupResult {
  legal_name: string
  name: string
  address: string
  cep: string
  municipio: string
  uf: string
}

export const lookupCnpj = async (cnpj: string): Promise<CnpjLookupResult> => {
  const clean = cnpj.replace(/\D/g, '')
  return pb.send(`/backend/v1/cnpj-lookup/${clean}`, { method: 'GET' })
}
