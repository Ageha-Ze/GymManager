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

interface Member {
  id: string
  member_code: string
  full_name: string
  phone: string
  email: string | null
  photo_url: string | null
}

interface DeleteMemberDialogProps {
  open: boolean
  onClose: () => void
  member: Member | null
  onSuccess: () => void
}

export default function DeleteMemberDialog({ open, onClose, member, onSuccess }: DeleteMemberDialogProps) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if (!member) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', member.id)

      if (error) throw error

      onSuccess()
    } catch (error) {
      console.error('Error deleting member:', error)
      toast.error('Gagal menghapus member', {
        description: (error as Error)?.message || 'Terjadi kesalahan saat menghapus member'
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
            ⚠️ Hapus Member?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-xl text-blue-700 font-semibold mt-4">
            Apakah Anda yakin ingin menghapus member <strong className="text-red-600">{member?.full_name}</strong>?
            <br />
            <br />
            <span className="text-lg text-red-600">Tindakan ini tidak dapat dibatalkan.</span> Semua data terkait member ini termasuk
            membership, pembayaran, dan check-in akan ikut terhapus.
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
