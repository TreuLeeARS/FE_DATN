import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'
import { useAIChat } from '@/hooks/ai/useAIChat.js'
import { ChatBubble } from './ChatBubble.jsx'
import { MessageList } from './MessageList.jsx'
import { InputBar } from './InputBar.jsx'
import { duration, ease } from '@/utils/animation/gsapDefaults.js'

export const AIStylingAssistant = () => {
  const {
    messages,
    isOpen,
    isTyping,
    sendMessage,
    sendSuggestion,
    toggleOpen,
    closeChat,
  } = useAIChat()

  const panelRef = useRef(null)

  useLayoutEffect(() => {
    if (!panelRef.current) return

    const ctx = gsap.context(() => {
      if (isOpen) {
        // Panel open animation
        gsap.to(panelRef.current, {
          scale: 1,
          opacity: 1,
          duration: duration.fast,
          ease: ease.back,
          pointerEvents: 'auto',
        })
      } else {
        // Panel close animation
        gsap.to(panelRef.current, {
          scale: 0.4,
          opacity: 0,
          duration: duration.fast * 0.7,
          ease: 'power2.in',
          pointerEvents: 'none',
        })
      }
    }, panelRef)

    return () => ctx.revert()
  }, [isOpen])

  const lastMessage = messages[messages.length - 1]

  return (
    <>
      {/* Chat Bubble */}
      <div className="fixed bottom-6 right-6 z-30">
        <ChatBubble
          isOpen={isOpen}
          onClick={toggleOpen}
          unreadCount={isOpen ? 0 : messages.filter(m => m.role === 'assistant').length - 1}
        />
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-24 right-6 z-20 w-80 h-96 bg-white rounded-lg
                     shadow-2xl flex flex-col border border-gray-200 origin-bottom-right"
          style={{ scale: 0, opacity: 0 }}
        >
          {/* Header */}
          <div className="bg-brand-charcoal text-white p-4 rounded-t-lg flex
                          items-center justify-between">
            <div>
              <h3 className="font-semibold">Trợ Lý Phối Đồ</h3>
              <p className="text-xs text-brand-cream">Luôn sẵn sàng hỗ trợ bạn</p>
            </div>
            <button
              onClick={closeChat}
              className="text-white hover:opacity-80 transition-opacity"
              aria-label="Đóng cửa sổ trò chuyện"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <MessageList messages={messages} isTyping={isTyping} />

          {/* Quick Suggestions */}
          {lastMessage && lastMessage.role === 'assistant' && lastMessage.suggestions && !isTyping && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="space-y-2">
                {lastMessage.suggestions.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendSuggestion(suggestion)}
                    className="w-full text-left text-xs px-3 py-2 bg-white border border-gray-200
                               rounded hover:border-brand-charcoal transition-colors text-brand-charcoal"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <InputBar onSend={sendMessage} disabled={isTyping} />
        </div>
      )}
    </>
  )
}
