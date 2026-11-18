export interface Citation {
  ref: string
  source_ref?: string
  snippet?: string
  quote?: string
  score?: number
  match?: string
  [key: string]: unknown
}

export interface AssistantMessage {
  id: number
  type: string
  text?: string
  done?: boolean
  label?: string
  detail?: string
  result?: Record<string, any>
  degraded?: boolean
  chain?: string
  items?: Citation[]
  citations?: Citation[]
  retryText?: string
  tone?: string
  title?: string
  blocked?: boolean
  streaming?: boolean
  src?: string
  [key: string]: any
}

export interface Evidence extends Citation {
  quote?: string
}

export interface Metrics {
  requests?: number
  cache_hits?: number
  cache_hit_rate?: number
  avg_first_token_ms?: number
  avg_total_ms?: number
  degraded?: number
  verify_flags?: number
  cache_entries?: number
  [key: string]: number | string | undefined
}

export interface QuizQuestion {
  stem: string
  options: string[]
  answer_index: number
  explanation?: string
}

export interface Quiz {
  topic: string
  questions: QuizQuestion[]
}

export interface AssistantOptions {
  roleName?: string
  prompt?: string
  displayText?: string
  skipCitationNotice?: boolean
  sources?: Citation[]
  notice?: { title?: string; text?: string }
}

export interface AssistantApi {
  open: (options?: AssistantOptions) => void
  ask: (options?: AssistantOptions) => void
}
