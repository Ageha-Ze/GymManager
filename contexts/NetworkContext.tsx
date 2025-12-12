'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { toast } from 'sonner'

interface NetworkContextType {
  isOnline: boolean
  isConnected: boolean
  retryCount: number
  forceRetry: () => void
}

const NetworkContext = createContext<NetworkContextType>({
  isOnline: true,
  isConnected: true,
  retryCount: 0,
  forceRetry: () => {},
})

export const useNetwork = () => useContext(NetworkContext)

// Enhanced fetch with retry logic and connection monitoring
export const fetchWithRetry = async (
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> => {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Check network connectivity before attempting
      if (!navigator.onLine) {
        throw new Error('No internet connection')
      }

      const response = await fetch(url, options)

      // Handle HTTP errors with retry for server errors (5xx)
      if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
        console.warn(`[NETWORK] Server error ${response.status}, retrying... (attempt ${attempt + 1}/${maxRetries + 1})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt))) // Exponential backoff
        continue
      }

      // Consider 4xx errors as permanent failures (don't retry)
      if (response.status >= 400 && response.status < 500) {
        console.error(`[NETWORK] Client error ${response.status}, no retry`)
        return response
      }

      return response
    } catch (error) {
      lastError = error as Error
      console.warn(`[NETWORK] Attempt ${attempt + 1} failed:`, error)

      // Don't retry on network unavailability or non-network errors
      if (!navigator.onLine || !(error as Error).message?.includes('fetch')) {
        break
      }

      if (attempt < maxRetries) {
        console.log(`[NETWORK] Retrying... (attempt ${attempt + 1}/${maxRetries + 1})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError || new Error('Network request failed after retries')
}

export const NetworkProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(true)
  const [isConnected, setIsConnected] = useState(true)
  const [retryCount, setRetryCount] = useState(0)

  const forceRetry = () => {
    console.log('[NETWORK] Manual retry triggered')
    setRetryCount(prev => prev + 1)
  }

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log('[NETWORK] Online detected')
      setIsOnline(true)
      setIsConnected(true)
    }

    const handleOffline = () => {
      console.warn('[NETWORK] Offline detected')
      setIsOnline(false)
      setIsConnected(false)
    }

    // Initial state
    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Test connection periodically (optimized)
  useEffect(() => {
    let isTestingConnection = false

    const testConnection = async () => {
      // Prevent concurrent connection tests
      if (isTestingConnection || !navigator.onLine) {
        return
      }

      isTestingConnection = true

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 3000) // 3 second timeout

        const testResponse = await fetch('/api/test-connection', {
          method: 'HEAD',
          headers: { 'Cache-Control': 'no-cache' },
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const hasConnectivity = testResponse.ok

        if (hasConnectivity && !isConnected) {
          setIsConnected(true)
          console.log('[NETWORK] Connection restored')
        } else if (!hasConnectivity && isConnected) {
          setIsConnected(false)
          console.log('[NETWORK] Connection lost')
        }
      } catch (error) {
        console.warn('[NETWORK] Connection test failed:', error)
        if (isConnected) {
          setIsConnected(false)
        }
      } finally {
        isTestingConnection = false
      }
    }

    // Test immediately and then every 30 seconds (reduced frequency)
    testConnection()
    const interval = setInterval(testConnection, 30000)

    return () => clearInterval(interval)
  }, [isConnected, retryCount])

  return (
    <NetworkContext.Provider value={{ isOnline, isConnected, retryCount, forceRetry }}>
      {children}
    </NetworkContext.Provider>
  )
}
