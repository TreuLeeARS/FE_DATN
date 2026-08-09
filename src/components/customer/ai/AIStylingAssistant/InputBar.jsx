import { useState } from 'react'

export const InputBar = ({ onSend, disabled = false }) => {
  const [inputValue, setInputValue] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (inputValue.trim()) {
      onSend(inputValue)
      setInputValue('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border-t border-gray-200 p-4 bg-white">
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Hỏi tôi bất cứ điều gì..."
          disabled={disabled}
          className="input-base flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={disabled || !inputValue.trim()}
          className="px-4 py-2 bg-brand-charcoal text-white rounded-lg
                     hover:bg-brand-blush hover:text-brand-charcoal transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>
    </form>
  )
}
