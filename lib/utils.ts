import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

// Client-side request blocker for development
if (typeof window !== 'undefined') {
  // Save original fetch
  const originalFetch = window.fetch

  // Override fetch to block Reason Labs requests
  window.fetch = function(...args) {
    const [resource] = args
    const url = typeof resource === 'string' ? resource : resource instanceof Request ? resource.url : ''

    // Block Reason Labs tracking requests
    if (url.includes('reasonlabsapi.com') || url.includes('ab.reasonlabs') || url.includes('sdk-QtSYWOMLlkHBbNMB')) {
      console.warn('🚫 Blocked Reason Labs tracking request:', url)
      return Promise.resolve(new Response('Blocked by CORS blocker', {
        status: 403,
        statusText: 'Forbidden'
      }))
    }

    return originalFetch.apply(this, args)
  }
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number | string | null,
  currency = 'IDR',
  locale = 'id-ID'
) {
  if (amount === null || amount === undefined) return 'Rp 0'

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numAmount)) return 'Rp 0'

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numAmount)
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }

  return new Intl.DateTimeFormat('id-ID', options || defaultOptions).format(
    new Date(date)
  )
}

export function formatDateShort(date: string | Date) {
  return formatDate(date, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

// Validation utilities
export const validators = {
  email: (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  },

  phone: (phone: string) => {
    const re = /^(\+62|62|0)[8-9][0-9]{7,11}$/
    return re.test(phone.replace(/\s/g, ''))
  },

  required: (value: unknown) => {
    if (typeof value === 'string') return value.trim().length > 0
    return value !== null && value !== undefined
  },

  minLength: (value: string, minLength: number) => {
    return value.length >= minLength
  },

  maxLength: (value: string, maxLength: number) => {
    return value.length <= maxLength
  },
}

// Calculate age from date of birth
export function calculateAge(dateOfBirth: string | Date): number {
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }

  return age
}

// Generate random ID
export function generateId(length = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// Check if two dates are in the same day
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// Get date range for filtering
export function getDateRange(period: 'today' | 'week' | 'month' | 'year'): { start: Date; end: Date } {
  const now = new Date()
  const start = new Date(now)
  const end = new Date(now)

  switch (period) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { start, end }

    case 'week':
      const dayOfWeek = now.getDay()
      start.setDate(now.getDate() - dayOfWeek)
      start.setHours(0, 0, 0, 0)
      end.setHours(23, 59, 59, 999)
      return { start, end }

    case 'month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      end.setDate(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate())
      end.setHours(23, 59, 59, 999)
      return { start, end }

    case 'year':
      start.setMonth(0, 1)
      start.setHours(0, 0, 0, 0)
      end.setMonth(11, 31)
      end.setHours(23, 59, 59, 999)
      return { start, end }

    default:
      return { start: now, end: now }
  }
}
