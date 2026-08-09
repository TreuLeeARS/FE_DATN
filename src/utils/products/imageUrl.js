const backendUrl = (import.meta.env.VITE_BE_URL || 'http://localhost:8081').replace(/\/$/, '')

export const PRODUCT_IMAGE_FALLBACK_URL = 'https://placehold.co/600x600/faf8f6/a3a3c2?text=No+Image'

export const isValidProductImageUrl = (value) => {
  if (typeof value !== 'string' || !value.trim()) return false

  const url = value.trim()
  if (url.startsWith('/')) return true

  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:'
  } catch {
    return false
  }
}

export const replaceBrokenProductImage = (event) => {
  const image = event.currentTarget
  image.onerror = null
  image.src = PRODUCT_IMAGE_FALLBACK_URL
}

export const resolveProductImageUrl = (url) => {
  const normalizedUrl = url
  if (typeof normalizedUrl !== 'string' || !normalizedUrl.trim()) return normalizedUrl

  if (
    normalizedUrl.startsWith('//') ||
    normalizedUrl.startsWith('data:') ||
    normalizedUrl.startsWith('blob:') ||
    /^[a-z][a-z\d+.-]*:/i.test(normalizedUrl)
  ) {
    return normalizedUrl
  }

  return normalizedUrl.startsWith('/')
    ? `${backendUrl}${normalizedUrl}`
    : `${backendUrl}/${normalizedUrl}`
}
