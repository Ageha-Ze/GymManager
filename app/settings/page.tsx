'use client'

import Layout from '@/components/layout/Layout'
import { Card, CardContent } from '@/components/ui/card'
import { Settings } from 'lucide-react'

export default function SettingsPage() {
  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Pengaturan</h1>
          <p className="text-lg text-muted-foreground mt-1">
            Kelola pengaturan sistem gym Anda
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-4">
              <Settings className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">
              Halaman Pengaturan
            </h3>
            <p className="text-lg text-muted-foreground text-center max-w-md">
              Halaman pengaturan akan tersedia di Phase 3. Saat ini sistem menggunakan
              pengaturan default.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
