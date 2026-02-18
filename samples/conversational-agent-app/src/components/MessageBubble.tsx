/**
 * MessageBubble - Individual message display with markdown, HTML preview, LaTeX, tool calls, interrupts, citations, and feedback
 */

import { memo, useState, useRef, useEffect, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { MessageRole } from '@uipath/uipath-typescript/conversational-agent'
import type { ChatMessage, ToolCallInfo, InterruptInfo } from '../types'
import { Spinner } from './Spinner'

// ─── Lazy KaTeX loader ───

let katexPromise: Promise<typeof import('katex')['default']> | null = null
function loadKatex() {
  if (!katexPromise) {
    katexPromise = import('katex').then((m) => m.default)
  }
  return katexPromise
}

// ─── Content parsing: split markdown from ```html and ```latex fenced blocks ───

interface ContentBlock {
  type: 'markdown' | 'html' | 'latex'
  content: string
}

function parseContentWithSpecialBlocks(content: string): ContentBlock[] {
  if (!content) return [{ type: 'markdown', content: '' }]

  const parts: ContentBlock[] = []
  const lowerContent = content.toLowerCase()
  let pos = 0

  while (pos < content.length) {
    // Find next opening fence: ```html or ```latex
    const htmlIdx = lowerContent.indexOf('```html', pos)
    const latexIdx = lowerContent.indexOf('```latex', pos)

    let openIdx = -1
    let blockType: 'html' | 'latex' = 'html'

    if (htmlIdx !== -1 && (latexIdx === -1 || htmlIdx <= latexIdx)) {
      openIdx = htmlIdx
      blockType = 'html'
    } else if (latexIdx !== -1) {
      openIdx = latexIdx
      blockType = 'latex'
    }

    if (openIdx === -1) break

    // Skip past the tag name to find the newline
    const tagEnd = openIdx + 3 + blockType.length
    const newlineIdx = content.indexOf('\n', tagEnd)
    if (newlineIdx === -1) break

    // Only whitespace allowed between tag name and newline
    if (content.slice(tagEnd, newlineIdx).trim() !== '') {
      pos = tagEnd
      continue
    }

    // Find closing ```
    const contentStart = newlineIdx + 1
    const closeIdx = content.indexOf('```', contentStart)
    if (closeIdx === -1) break

    // Add preceding markdown
    if (openIdx > pos) {
      const md = content.slice(pos, openIdx).trim()
      if (md) parts.push({ type: 'markdown', content: md })
    }

    // Add special block
    const blockContent = content.slice(contentStart, closeIdx).trim()
    if (blockContent) parts.push({ type: blockType, content: blockContent })

    pos = closeIdx + 3
  }

  // Add remaining content
  if (pos < content.length) {
    const md = content.slice(pos).trim()
    if (md) parts.push({ type: 'markdown', content: md })
  }

  if (parts.length === 0) return [{ type: 'markdown', content }]
  return parts
}

// ─── SandboxedHtml ───

const HEIGHT_STEP = 100
const MIN_HEIGHT = 100
const MAX_HEIGHT = 2000
const DEFAULT_HEIGHT = 200

function SandboxedHtml({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(DEFAULT_HEIGHT)
  const [showRaw, setShowRaw] = useState(false)

  const srcDoc = useMemo(() => {
    if (html.includes('<html') || html.includes('<!DOCTYPE')) return html
    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;margin:8px;color:#333;}</style></head><body>${html}</body></html>`
  }, [html])

  useEffect(() => {
    if (showRaw) return
    const iframe = iframeRef.current
    if (!iframe) return

    const handleLoad = () => {
      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document
        if (doc?.body) {
          setHeight(Math.min(Math.max(doc.body.scrollHeight + 20, MIN_HEIGHT), MAX_HEIGHT))
        }
      } catch {
        // Cross-origin restrictions
      }
    }

    iframe.addEventListener('load', handleLoad)
    return () => iframe.removeEventListener('load', handleLoad)
  }, [srcDoc, showRaw])

  return (
    <div className="my-2 border border-white/10 rounded-lg overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10 text-xs">
        <div className="flex gap-1">
          <button
            onClick={() => setShowRaw(false)}
            className={`px-2 py-0.5 rounded transition-colors ${!showRaw ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-300'}`}
          >
            Preview
          </button>
          <button
            onClick={() => setShowRaw(true)}
            className={`px-2 py-0.5 rounded transition-colors ${showRaw ? 'bg-accent/20 text-accent' : 'text-gray-400 hover:text-gray-300'}`}
          >
            Raw HTML
          </button>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setHeight(h => Math.max(h - HEIGHT_STEP, MIN_HEIGHT))}
            disabled={height <= MIN_HEIGHT}
            className="px-1.5 py-0.5 text-gray-400 hover:text-gray-300 disabled:opacity-30"
            title="Decrease height"
          >
            &minus;
          </button>
          <button
            onClick={() => setHeight(h => Math.min(h + HEIGHT_STEP, MAX_HEIGHT))}
            disabled={height >= MAX_HEIGHT}
            className="px-1.5 py-0.5 text-gray-400 hover:text-gray-300 disabled:opacity-30"
            title="Increase height"
          >
            +
          </button>
        </div>
      </div>
      {/* Content */}
      {showRaw ? (
        <pre className="p-3 overflow-auto text-xs text-gray-300 whitespace-pre-wrap break-all" style={{ height: `${height}px` }}>
          {html}
        </pre>
      ) : (
        <iframe
          ref={iframeRef}
          srcDoc={srcDoc}
          sandbox="allow-same-origin"
          className="w-full border-0 bg-white"
          style={{ height: `${height}px` }}
          title="HTML content"
        />
      )}
    </div>
  )
}

// ─── RenderedLatex ───

function RenderedLatex({ latex }: { latex: string }) {
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)
    setError(null)

    loadKatex()
      .then((katex) => {
        if (cancelled) return
        try {
          const html = katex.renderToString(latex, {
            displayMode: true,
            throwOnError: false,
            errorColor: '#dc2626',
            trust: true,
          })
          setRenderedHtml(html)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'KaTeX render error')
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError('Failed to load KaTeX library')
        setIsLoading(false)
      })

    return () => { cancelled = true }
  }, [latex])

  if (isLoading) {
    return <div className="my-2 p-3 bg-white/5 rounded-lg text-sm text-gray-400">Loading LaTeX...</div>
  }

  if (error) {
    return (
      <div className="my-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm">
        <div className="text-red-400 font-medium mb-1">LaTeX Error</div>
        <pre className="text-xs text-red-300">{error}</pre>
        <pre className="mt-2 text-xs text-gray-400">{latex}</pre>
      </div>
    )
  }

  return (
    <div
      className="my-2 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: renderedHtml! }}
    />
  )
}

// ─── Markdown renderer shared across blocks ───

function MarkdownBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const isInline = !match

          if (isInline) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          }

          return (
            <div className="relative group">
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CodeCopyButton text={String(children)} />
              </div>
              <code className={className} {...props}>
                {children}
              </code>
            </div>
          )
        },
        a({ children, href, ...props }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
              {...props}
            >
              {children}
            </a>
          )
        }
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

// ─── Code block copy button with feedback ───

function CodeCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(text).catch(err => console.error('Failed to copy:', err))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="px-2 py-1 text-xs bg-white/10 hover:bg-white/20 rounded transition-colors"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

// ─── Multi-block content renderer ───

function ContentRenderer({ message }: { message: ChatMessage }) {
  // If the entire content is HTML (from text/html MIME type), render as SandboxedHtml
  if (message.contentType === 'html') {
    return <SandboxedHtml html={message.content} />
  }

  // For text/markdown, parse for ```html and ```latex fenced blocks
  const blocks = parseContentWithSpecialBlocks(message.content || (message.isStreaming ? '' : 'No content'))

  return (
    <>
      {blocks.map((block, i) => {
        if (block.type === 'html') return <SandboxedHtml key={i} html={block.content} />
        if (block.type === 'latex') return <RenderedLatex key={i} latex={block.content} />
        return <MarkdownBlock key={i} content={block.content} />
      })}
    </>
  )
}

// ─── MessageBubble ───

interface MessageBubbleProps {
  message: ChatMessage
  onFeedback?: (messageId: string, rating: 'positive' | 'negative') => void
  onResolveInterrupt?: (messageId: string, approved: boolean) => void
}

export const MessageBubble = memo(function MessageBubble({ message, onFeedback, onResolveInterrupt }: MessageBubbleProps) {
  const isUser = message.role === MessageRole.User
  const isSystem = message.role === MessageRole.System
  const [copied, setCopied] = useState(false)

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content).catch(err => console.error('Failed to copy:', err))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`px-6 py-4 ${isUser ? 'bg-transparent' : 'bg-chat-input/30'}`}>
      <div className="flex gap-4">
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
          isUser ? 'bg-blue-500/20' : isSystem ? 'bg-yellow-500/20' : 'bg-accent/20'
        }`}>
          {isUser ? (
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          ) : isSystem ? (
            <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Role label */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {isUser ? 'You' : isSystem ? 'System' : 'Assistant'}
            </span>
            <span className="text-xs text-gray-500">
              {formatTime(message.timestamp)}
            </span>
          </div>

          {/* Tool Calls */}
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="space-y-2 mb-3">
              {message.toolCalls.map((tc) => (
                <ToolCallCard key={tc.toolCallId} toolCall={tc} />
              ))}
            </div>
          )}

          {/* Interrupt Banner */}
          {message.interrupt && (
            <InterruptBanner
              interrupt={message.interrupt}
              messageId={message.id}
              onResolve={onResolveInterrupt}
            />
          )}

          {/* Message content - multimodal branching */}
          <div className={`markdown-content ${message.isStreaming ? 'typing-cursor' : ''}`}>
            {isUser ? (
              <p className="whitespace-pre-wrap">{message.content}</p>
            ) : message.contentType === 'image' && message.imageData ? (
              <div className="rounded-lg overflow-hidden max-w-md">
                <img
                  src={`data:image/png;base64,${message.imageData}`}
                  alt="Generated image"
                  className="w-full h-auto"
                />
              </div>
            ) : (
              <ContentRenderer message={message} />
            )}
          </div>

          {/* Citations */}
          {message.citations && message.citations.length > 0 && (
            <CitationsList citations={message.citations} />
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {message.attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded text-xs text-gray-400"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  {attachment}
                </div>
              ))}
            </div>
          )}

          {/* Actions for assistant messages */}
          {!isUser && !isSystem && !message.isStreaming && (
            <div className="flex items-center gap-2 mt-3 opacity-0 hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopyMessage}
                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                title={copied ? 'Copied!' : 'Copy message'}
              >
                {copied ? (
                  <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => onFeedback?.(message.id, 'positive')}
                className={`p-1.5 hover:bg-white/10 rounded transition-colors ${
                  message.feedbackRating === 'positive' ? 'bg-green-500/20' : ''
                }`}
                title="Good response"
              >
                <svg className={`w-4 h-4 ${message.feedbackRating === 'positive' ? 'text-green-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </button>
              <button
                onClick={() => onFeedback?.(message.id, 'negative')}
                className={`p-1.5 hover:bg-white/10 rounded transition-colors ${
                  message.feedbackRating === 'negative' ? 'bg-red-500/20' : ''
                }`}
                title="Bad response"
              >
                <svg className={`w-4 h-4 ${message.feedbackRating === 'negative' ? 'text-red-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

// ─── ToolCallCard ───

const ToolCallCard = memo(function ToolCallCard({ toolCall }: { toolCall: ToolCallInfo }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const statusColor = toolCall.isError
    ? 'text-red-400 bg-red-500/10 border-red-500/20'
    : toolCall.isComplete
      ? 'text-green-400 bg-green-500/10 border-green-500/20'
      : 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'

  const statusLabel = toolCall.isError
    ? 'Error'
    : toolCall.isComplete
      ? 'Completed'
      : 'Running...'

  return (
    <div className={`border rounded-lg overflow-hidden ${statusColor}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="font-medium flex-1 truncate">{toolCall.toolName}</span>
        <span className="text-xs opacity-75">{statusLabel}</span>
        {!toolCall.isComplete && (
          <Spinner className="w-3 h-3 border-current" />
        )}
        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-3 py-2 border-t border-current/20 text-xs space-y-2">
          {toolCall.input && (
            <div>
              <span className="font-medium opacity-75">Input:</span>
              <pre className="mt-1 p-2 bg-black/20 rounded overflow-x-auto whitespace-pre-wrap break-all">
                {formatJson(toolCall.input)}
              </pre>
            </div>
          )}
          {toolCall.output && (
            <div>
              <span className="font-medium opacity-75">Output:</span>
              <pre className="mt-1 p-2 bg-black/20 rounded overflow-x-auto whitespace-pre-wrap break-all">
                {formatJson(toolCall.output)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

// ─── InterruptBanner ───

function InterruptBanner({
  interrupt,
  messageId,
  onResolve
}: {
  interrupt: InterruptInfo
  messageId: string
  onResolve?: (messageId: string, approved: boolean) => void
}) {
  const confirmValue = interrupt.value as { toolName?: string; inputValue?: unknown } | undefined

  if (interrupt.resolved) {
    return (
      <div className={`mb-3 px-3 py-2 rounded-lg text-sm ${
        interrupt.approved
          ? 'bg-green-500/10 border border-green-500/20 text-green-400'
          : 'bg-red-500/10 border border-red-500/20 text-red-400'
      }`}>
        {interrupt.approved ? 'Approved' : 'Rejected'}
        {confirmValue?.toolName && ` — ${confirmValue.toolName}`}
      </div>
    )
  }

  return (
    <div className="mb-3 px-3 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
      <div className="flex items-start gap-2">
        <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-yellow-400">Tool Call Confirmation Required</p>
          {confirmValue?.toolName && (
            <p className="text-xs text-gray-400 mt-1">
              Tool: <span className="font-mono">{confirmValue.toolName}</span>
            </p>
          )}
          {confirmValue?.inputValue != null && (
            <pre className="mt-1 p-2 bg-black/20 rounded text-xs overflow-x-auto whitespace-pre-wrap break-all text-gray-300">
              {formatJson(typeof confirmValue.inputValue === 'string' ? confirmValue.inputValue : JSON.stringify(confirmValue.inputValue))}
            </pre>
          )}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => onResolve?.(messageId, true)}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
            >
              Approve
            </button>
            <button
              onClick={() => onResolve?.(messageId, false)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
            >
              Reject
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── CitationsList ───

function CitationsList({ citations }: { citations: ChatMessage['citations'] }) {
  if (!citations || citations.length === 0) return null

  // Deduplicate sources by number
  const uniqueSources = new Map<number, { title: string; number: number; url?: string; downloadUrl?: string }>()
  for (const citation of citations) {
    for (const source of citation.sources) {
      if (!uniqueSources.has(source.number)) {
        uniqueSources.set(source.number, source)
      }
    }
  }

  const sources = Array.from(uniqueSources.values()).sort((a, b) => a.number - b.number)

  return (
    <div className="mt-3 pt-3 border-t border-white/10">
      <p className="text-xs font-medium text-gray-400 mb-1">Sources:</p>
      <ol className="space-y-1">
        {sources.map((source) => {
          const href = source.url || source.downloadUrl
          return (
            <li key={source.number} className="text-xs text-gray-400 flex items-start gap-1.5">
              <span className="font-mono text-accent/70">[{source.number}]</span>
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:underline truncate"
                >
                  {source.title}
                </a>
              ) : (
                <span>{source.title}</span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ─── Utilities ───

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(date)
}

function formatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}
