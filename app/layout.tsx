import { Inter } from 'next/font/google'
import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/contexts/AuthContext'
import { NetworkProvider } from '@/contexts/NetworkContext'
import { Toaster } from 'sonner'
import '@/lib/utils' // Import utils to enable fetch blocking

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gym Management System',
  description: 'Manage your gym members, memberships, and check-ins',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body className={inter.className}>
        <NetworkProvider>
          <AuthProvider>
            {children}
            <Toaster richColors position="top-right" />
          </AuthProvider>
        </NetworkProvider>
      </body>
    </html>
  )
}
