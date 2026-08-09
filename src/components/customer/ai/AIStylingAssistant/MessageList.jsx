import { useEffect, useRef } from 'react'

export const MessageList = ({ messages, isTyping }) => {
  const listRef = useRef(null)
  const endRef = useRef(null)

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  return (
    <div
      ref={listRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 bg-white"
    >
      {messages.length === 0 ? (
        <div className="text-center text-brand-muted py-8">
          <p className="text-sm">Hãy bắt đầu trò chuyện với trợ lý phối đồ AI!</p>
        </div>
      ) : (
        messages.map(message => (
          <div
            key={message.id}
            className={cn(
              'flex',
              message.role === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                'max-w-xs px-4 py-2 rounded-lg text-sm',
                message.role === 'user'
                  ? 'bg-brand-charcoal text-white rounded-br-none'
                  : 'bg-gray-100 text-brand-charcoal rounded-bl-none'
              )}
            >
              {message.content}
            </div>
          </div>
        ))
      )}

      {/* Typing indicator */}
      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-gray-100 text-brand-charcoal px-4 py-2 rounded-lg">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-brand-charcoal rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-brand-charcoal rounded-full animate-bounce"
                   style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-brand-charcoal rounded-full animate-bounce"
                   style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  )
}

const cn = (...classes) => classes.filter(Boolean).join(' ')
