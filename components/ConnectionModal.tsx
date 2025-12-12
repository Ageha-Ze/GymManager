'use client'

import { useNetwork } from '@/contexts/NetworkContext'
import { WifiOff, RefreshCw, Wifi } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ConnectionModal() {
  const { isOnline, isConnected, forceRetry } = useNetwork()

  // Only show when there's no connection
  if (isConnected) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
      <style jsx global>{`
        body {
          pointer-events: none !important;
        }
        .connection-modal-content {
          pointer-events: auto !important;
        }
      `}</style>

      {/* Invisible overlay to capture clicks */}
      <div className="absolute inset-0" onClick={(e) => e.preventDefault()} />

      <div className="connection-modal-content bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 max-w-md mx-4 text-center border relative z-10">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <WifiOff className="w-8 h-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {!isOnline ? 'Koneksi Hilang' : 'Koneksi Bermasalah'}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
            {!isOnline
              ? 'Tidak dapat terhubung ke internet. Periksa koneksi WiFi atau data seluler Anda.'
              : 'Koneksi internet bermasalah. Aplikasi tidak dapat mengakses server.'
            }
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={forceRetry}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            disabled={!isOnline} // Disable if no internet at all
          >
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            Coba Sambungkan Lagi
          </Button>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            {!isOnline
              ? 'Aktifkan WiFi atau data seluler untuk melanjutkan'
              : 'Mencoba memperbaiki koneksi otomatis...'
            }
          </div>
        </div>
      </div>
    </div>
  )
}
