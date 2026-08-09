import { useLayoutEffect, useRef } from 'react'
import gsap from 'gsap'

export const ChatBubble = ({ isOpen, onClick, unreadCount = 0 }) => {
  const bubbleRef = useRef(null)

  useLayoutEffect(() => {
    if (!isOpen && bubbleRef.current) {
      // Pulse animation when chat is closed
      const pulse = gsap.to(bubbleRef.current, {
        scale: 1.1,
        duration: 0.6,
        yoyo: true,
        repeat: -1,
        ease: 'sine.inOut',
        paused: isOpen,
      })

      return () => pulse.kill()
    }
  }, [isOpen])

  return (
    <button
      ref={bubbleRef}
      onClick={onClick}
      className="relative flex items-center justify-center w-16 h-16 bg-brand-charcoal
                 text-white rounded-full shadow-lg hover:shadow-xl transition-shadow
                 duration-300 hover:bg-brand-blush hover:text-brand-charcoal"
      aria-label="Mở trợ lý phối đồ AI"
    >
      <svg
        className="w-8 h-8"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
        />
      </svg>

      {/* Unread indicator */}
      {unreadCount > 0 && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-blush text-brand-charcoal
                        rounded-full flex items-center justify-center text-xs font-bold">
          {unreadCount}
        </div>
      )}
    </button>
  )
}
