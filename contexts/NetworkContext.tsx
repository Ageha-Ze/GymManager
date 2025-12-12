'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react'

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
      if (!navigator.onLine) {
        throw new Error('No internet connection')
      }

      const response = await fetch(url, options)

      if (response.status >= 500 && response.status < 600 && attempt < maxRetries) {
        console.warn(`[NETWORK] Server error ${response.status}, retrying... (attempt ${attempt + 1}/${maxRetries + 1})`)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)))
        continue
      }

      if (response.status >= 400 && response.status < 500) {
        console.error(`[NETWORK] Client error ${response.status}, no retry`)
        return response
      }

      return response
    } catch (error) {
      lastError = error as Error
      console.warn(`[NETWORK] Attempt ${attempt + 1} failed:`, error)

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
  const isTestingRef = useRef(false)

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

    setIsOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Test connection periodically - FIXED
  useEffect(() => {
    const testConnection = async () => {
      // Skip if already testing or offline
      if (isTestingRef.current || !navigator.onLine) {
        return
      }

      isTestingRef.current = true

      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 5000) // Increased to 5 seconds

        // Test with a simple request that won't be blocked by CSP
        const testResponse = await fetch(window.location.origin + '/favicon.ico', {
          method: 'HEAD',
          cache: 'no-store',
          signal: controller.signal,
        })

        clearTimeout(timeoutId)

        const hasConnectivity = testResponse.ok || testResponse.status === 404 // 404 is fine, means server responded

        if (hasConnectivity !== isConnected) {
          setIsConnected(hasConnectivity)
          console.log(`[NETWORK] Connection ${hasConnectivity ? 'restored' : 'lost'}`)
        }
      } catch (error) {
        console.warn('[NETWORK] Connection test failed:', error)
        // Only set to disconnected if we're currently connected
        // This prevents false negatives
        if (isConnected && navigator.onLine) {
          setIsConnected(false)
        }
      } finally {
        isTestingRef.current = false
      }
    }

    // Test immediately on mount and after retry
    testConnection()

    // Then test every 30 seconds
    const interval = setInterval(testConnection, 30000)

    return () => clearInterval(interval)
  }, [retryCount]) // Removed isConnected from deps to prevent loop

  return (
    <NetworkContext.Provider value={{ isOnline, isConnected, retryCount, forceRetry }}>
      {children}
    </NetworkContext.Provider>
  )
}