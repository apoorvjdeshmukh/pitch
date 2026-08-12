export interface FitAnalysis {
  summary: string
  strengths: string[]
  gaps: Array<{ text: string; remedy: string; competencyKey?: string } | string>
  basedOnBackground?: boolean
  fitScore?: number
}

export interface FlashCard {
  front: string
  back: string
}

export interface CampaignArtifacts {
  fitAnalysis: FitAnalysis
  companyCards: FlashCard[]
  roleVocabCards: FlashCard[]
}

export interface BulletItem {
  title: string
  detail: string
}

export type SectionItem = BulletItem | FlashCard | string

export interface ArtifactSection {
  title: string
  type: 'bullets' | 'cards' | 'list'
  items: SectionItem[]
}

export interface RoundArtifacts {
  sections: ArtifactSection[]
}

export interface InterviewerSignals {
  name: string
  title: string
  background: string
  priorities: string[]
  storyAngle: string
  questionsToAsk: string[]
  keyInsight: string
}

export interface BriefStory {
  title: string
  angle: string
}

export interface Brief {
  storiesToLead: BriefStory[]
  companyFacts: string[]
  interviewerNote: string
  questionsToAsk: string[]
  generatedAt?: string
}

export type RoundStatus = 'not-started' | 'in-prep' | 'done'

export interface Round {
  id: string
  type: string
  status: RoundStatus
  interviewerProfile: string
  interviewerSignals: InterviewerSignals | null
  artifacts: RoundArtifacts | null
  brief: Brief | null
  scheduledAt?: string | null
}

export type CampaignFileType = 'pdf' | 'docx' | 'xlsx' | 'image' | 'link'

export interface CampaignFile {
  id: string
  type: CampaignFileType
  name: string
  // Uploaded files (pdf/docx/xlsx/image): path within the private Storage bucket, signed URL generated on demand.
  storagePath?: string
  // Links only: the URL itself.
  url?: string
  sizeBytes?: number
  createdAt: string
}

export interface Campaign {
  id: string
  role: string
  company: string
  jd: string
  createdAt: string
  artifacts: CampaignArtifacts
  rounds: Round[]
  active: boolean
  hidden?: boolean
  files?: CampaignFile[]
  expectedRounds?: number | null
}

export interface Story {
  id: string
  title: string
  situation: string
  task: string
  action: string
  result: string
  competencies: string[]
  createdAt: string
  fromCampaign: string
  fromRound?: string
}

export interface QAMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface QAState {
  competency: string
  roundType: string
  company: string
  messages: QAMessage[]
  exchangeCount: number
  draft: Partial<Story> | null
}

export interface ProfileCompetency {
  key: string
  evidence: string
}

export interface Profile {
  summary: string
  competencies: ProfileCompetency[]
  linkedin?: string
  resume?: string
  updatedAt?: string
  firstName?: string
  lastName?: string
  onboarded?: boolean
  aboutSeen?: boolean
}

export interface ArtifactDoc {
  id: string
  icon: string
  title: string
  subtitle: string
  desc: string
  tags: string[]
  url: string
  campaignCompany?: string  // case-insensitive substring match against campaign.company
}
