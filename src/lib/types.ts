export type Role = 'master' | 'stakeholder'

export type DocumentStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Aguardando Aprovação'
  | 'Vencido'

export interface Requirement {
  id: string
  title: string
  description: string
  mandatory: boolean
  expires: boolean
}

export interface RequirementGroup {
  id: string
  name: string
  requirements: Requirement[]
}

export interface UploadedDoc {
  id: string
  reqId: string
  status: DocumentStatus
  fileName?: string
  uploadDate?: string
  comments?: string
}

export interface User {
  id: string
  name: string
  email: string
  role: Role
  groupId?: string // For stakeholders
  avatar?: string
}
