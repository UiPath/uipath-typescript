/**
 * Shared types for the conversational agent app
 */

import { type MessageRole } from '@uipath/uipath-typescript/conversational-agent'

export interface ToolCallInfo {
  toolCallId: string
  toolName: string
  input?: string
  output?: string
  isError?: boolean
  isComplete: boolean
}

export interface InterruptInfo {
  interruptId: string
  type: string
  value?: unknown
  resolved: boolean
  approved?: boolean
}

export interface CitationInfo {
  citationId: string
  offset: number
  length: number
  sources: Array<{ title: string; number: number; url?: string; downloadUrl?: string }>
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  exchangeId?: string
  isStreaming?: boolean
  attachments?: string[]
  toolCalls?: ToolCallInfo[]
  interrupt?: InterruptInfo
  citations?: CitationInfo[]
  contentType?: 'text' | 'image' | 'markdown' | 'html'
  feedbackRating?: 'positive' | 'negative'
  imageData?: string
}
