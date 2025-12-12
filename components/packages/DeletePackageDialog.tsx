'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface Package {
  id: string
  package_name: string
}

interface DeletePackageDialogProps {
  open: boolean
  onClose: () => void
  package?: Package | null
  onSuccess: () => void
}

export default function DeletePackageDialog({ open, onClose, package: pkg, onSuccess }: DeletePackageDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!pkg) return

    setLoading(true)
    try {
      // Check if package is used by any active memberships
      const { data: activeMemberships, error: checkError } = await supabase
        .from('member_memberships')
        .select('id')
        .eq('package_id', pkg.id)
        .in('status', ['active', 'pending'])

      if (checkError) throw checkError

      if (activeMemberships && activeMemberships.length > 0) {
        toast.error('Tidak dapat menghapus paket yang masih digunakan oleh member aktif')
        return
      }

      // Delete package
      const { error } = await supabase
        .from('membership_packages')
        .delete()
        .eq('id', pkg.id)

      if (error) throw error

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error deleting package:', error)
      toast.error('Gagal menghapus paket', {
        description: (error as Error)?.message || 'Terjadi kesalahan saat menghapus paket'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white rounded-2xl shadow-2xl border border-blue-100">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-3xl font-bold text-red-600 flex items-center gap-3">
            ⚠️ Hapus Paket?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xl text-blue-700 font-semibold mt-4">
            Apakah Anda yakin ingin menghapus paket <strong className="text-red-600">{pkg?.package_name}</strong>?
            <br />
            <br />
            <span className="text-lg text-red-600">Tindakan ini tidak dapat dibatalkan.</span> Pastikan tidak ada member yang menggunakan paket ini dalam membership aktif.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-4 pt-6 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={loading}
            className="flex-1 h-16 text-xl font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 cursor-pointer"
          >
            Batal
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 h-16 text-xl font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
          >
            {loading ? 'Menghapus...' : 'Ya, Hapus'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
