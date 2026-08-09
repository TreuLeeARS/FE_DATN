import { useState, useCallback, useRef, useEffect } from 'react'
import { getResponse } from '@/data/ai/aiResponses.js'

// Custom hook for managing AI chat state and message flow
export const useAIChat = () => {
  const [messages, setMessages] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [stage, setStage] = useState('greeting')
  const timeoutRef = useRef(null)

  const generateId = () => `msg-${Date.now()}-${Math.random()}`

  const sendMessage = useCallback((text) => {
    if (!text.trim()) return

    // Add user message
    const userMessage = {
      id: generateId(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setIsTyping(true)
    setStage('free-chat')

    // Simulate API response delay (800-1400ms)
    const delay = 800 + Math.random() * 600
    timeoutRef.current = setTimeout(() => {
      const responseData = getResponse(text)
      const assistantMessage = {
        id: generateId(),
        role: 'assistant',
        content: responseData.response,
        timestamp: new Date(),
        suggestions: responseData.suggestions || [],
      }

      setMessages(prev => [...prev, assistantMessage])
      setIsTyping(false)
    }, delay)
  }, [])

  const sendSuggestion = useCallback((suggestion) => {
    sendMessage(suggestion)
  }, [sendMessage])

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => {
      const nextOpen = !prev
      if (nextOpen && messages.length === 0) {
        // Send greeting on first open
        setTimeout(() => {
          sendMessage('')
          setMessages([{
            id: generateId(),
            role: 'assistant',
            content: 'Xin chào! 👋 Chào mừng bạn đến với OUTTA! Tôi là Trợ Lý Phối Đồ AI. Hôm nay bạn đang tìm gì nào?',
            timestamp: new Date(),
            suggestions: ['Hàng mới về', 'Sản phẩm khuyến mãi', 'Giúp tôi chọn'],
          }])
          setStage('greeting')
        }, 300)
      }
      return nextOpen
    })
  }, [messages.length, sendMessage])

  const closeChat = useCallback(() => {
    setIsOpen(false)
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
    setStage('greeting')
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    messages,
    isOpen,
    isTyping,
    stage,
    sendMessage,
    sendSuggestion,
    toggleOpen,
    closeChat,
    clearMessages,
  }
}
