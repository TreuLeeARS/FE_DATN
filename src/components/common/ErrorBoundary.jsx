import { Component } from 'react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-cream flex flex-col justify-center items-center px-6 py-12 text-center font-sans">
          <div className="max-w-md w-full bg-white border border-gray-100 shadow-2xl p-8 md:p-10 rounded-2xl">
            {/* Warning Icon */}
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 text-red-500 border border-red-100">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            <h2 className="font-display text-2xl font-bold text-brand-charcoal mb-3">
              Đã xảy ra sự cố!
            </h2>
            <p className="text-brand-muted text-sm leading-relaxed mb-8">
              Ứng dụng gặp một lỗi không mong muốn khi tải trang này. Vui lòng quay trở lại Trang chủ hoặc thử lại.
            </p>

            {/* Error detail in dev environment */}
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-[10px] bg-red-50 text-red-800 p-4 rounded-lg overflow-x-auto mb-8 border border-red-150 font-mono">
                {this.state.error.toString()}
              </pre>
            )}

            <button
              onClick={this.handleReset}
              className="w-full bg-brand-charcoal text-white py-3.5 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-brand-dark transition-all duration-300 active:scale-[0.98] cursor-pointer"
            >
              Quay lại trang chủ
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
