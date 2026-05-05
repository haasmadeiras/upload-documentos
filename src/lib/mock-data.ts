import { RequirementGroup, UploadedDoc, User } from './types'

export const mockGroups: RequirementGroup[] = [
  {
    id: 'g1',
    name: 'Fornecedor de TI',
    requirements: [
      {
        id: 'r1',
        title: 'Contrato Social',
        description: 'Cópia atualizada do Contrato Social da empresa.',
        mandatory: true,
        expires: false,
      },
      {
        id: 'r2',
        title: 'Certidão Negativa de Débitos (CND)',
        description: 'Certidão conjunta de débitos relativos a tributos federais.',
        mandatory: true,
        expires: true,
      },
      {
        id: 'r3',
        title: 'Certificação ISO 27001',
        description: 'Comprovação de práticas de segurança da informação.',
        mandatory: false,
        expires: true,
      },
    ],
  },
  {
    id: 'g2',
    name: 'Prestador de Serviços Gerais',
    requirements: [
      {
        id: 'r4',
        title: 'Alvará de Funcionamento',
        description: 'Alvará emitido pela prefeitura local.',
        mandatory: true,
        expires: true,
      },
    ],
  },
]

export const mockUploads: UploadedDoc[] = [
  {
    id: 'u1',
    reqId: 'r1',
    status: 'Aprovado',
    fileName: 'contrato_social_v2.pdf',
    uploadDate: '2023-10-15T10:00:00Z',
  },
  {
    id: 'u2',
    reqId: 'r2',
    status: 'Rejeitado',
    fileName: 'cnd_desatualizada.pdf',
    uploadDate: '2023-10-16T14:30:00Z',
    comments: 'Documento vencido. Favor enviar a versão mais recente.',
  },
]

export const mockUsers: User[] = [
  {
    id: 'u-master',
    name: 'Admin Global',
    email: 'admin@empresa.com',
    role: 'master',
    avatar: 'https://img.usecurling.com/ppl/thumbnail?gender=female&seed=1',
  },
  {
    id: 'u-stakeholder',
    name: 'Tech Solutions LTDA',
    email: 'contato@techsolutions.com',
    role: 'stakeholder',
    groupId: 'g1', // Fornecedor de TI
    avatar: 'https://img.usecurling.com/i?q=technology&color=blue&shape=fill',
  },
]
