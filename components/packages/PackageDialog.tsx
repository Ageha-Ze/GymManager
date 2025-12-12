'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Package {
  id: string
  package_name: string
  duration_days: number
  price: number
  description: string | null
  is_active: boolean
}

interface PackageDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  package?: Package | null
  isEdit?: boolean
}

export default function PackageDialog({ open, onClose, onSuccess, package: pkg = null, isEdit = false }: PackageDialogProps) {
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    package_name: '',
    duration_days: '',
    price: '',
    description: '',
    is_active: true
  })

  useEffect(() => {
    if (pkg && isEdit) {
      setFormData({
        package_name: pkg.package_name || '',
        duration_days: pkg.duration_days?.toString() || '',
        price: pkg.price?.toString() || '',
        description: pkg.description || '',
        is_active: pkg.is_active ?? true
      })
    } else {
      resetForm()
    }
  }, [pkg, isEdit, open])

  const resetForm = () => {
    setFormData({
      package_name: '',
      duration_days: '',
      price: '',
      description: '',
      is_active: true
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.package_name.trim()) {
        toast.error('Nama paket harus diisi')
        return
      }
      if (!formData.duration_days || parseInt(formData.duration_days) <= 0) {
        toast.error('Durasi harus lebih dari 0 hari')
        return
      }
      if (!formData.price || parseFloat(formData.price) <= 0) {
        toast.error('Harga harus lebih dari 0')
        return
      }

      const packageData = {
        package_name: formData.package_name.trim(),
        duration_days: parseInt(formData.duration_days),
        price: parseFloat(formData.price),
        description: formData.description.trim() || null,
        is_active: formData.is_active
      }

      if (isEdit && pkg) {
        // Update package
        const { error } = await supabase
          .from('membership_packages')
          .update({
            ...packageData,
            updated_at: new Date().toISOString()
          })
          .eq('id', pkg.id)

        if (error) throw error
      } else {
        // Create new package
        const { error } = await supabase
          .from('membership_packages')
          .insert(packageData)

        if (error) throw error
      }

      onSuccess()
      resetForm()
      onClose()
    } catch (error) {
      console.error('Error saving package:', error)
      toast.error(isEdit ? 'Gagal update paket' : 'Gagal menambah paket')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '')
    return numericValue
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-blue-800 flex items-center gap-3">
            📦 {isEdit ? 'Edit Paket' : 'Tambah Paket Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="package_name" className="text-base">Nama Paket *</Label>
              <Input
                id="package_name"
                value={formData.package_name}
                onChange={(e) => setFormData({ ...formData, package_name: e.target.value })}
                placeholder="Contoh: Bulanan, Tahunan"
                required
                className="h-12 text-base border-blue-200 focus:border-orange-400"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration_days" className="text-base">Durasi (Hari) *</Label>
                <Input
                  id="duration_days"
                  type="number"
                  min="1"
                  value={formData.duration_days}
                  onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                  placeholder="30"
                  required
                  className="h-12 text-base border-blue-200 focus:border-orange-400"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="price" className="text-base">Harga (Rp) *</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.price}
                  onChange={(e) => {
                    const value = formatCurrency(e.target.value)
                    setFormData({ ...formData, price: value })
                  }}
                  placeholder="300000"
                  required
                  className="h-12 text-base border-blue-200 focus:border-orange-400"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-base">Deskripsi</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Deskripsi paket (opsional)"
                rows={3}
                className="text-base border-blue-200 focus:border-orange-400"
                disabled={loading}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-orange-50 border border-blue-200 rounded-lg shadow-sm">
              <Label htmlFor="is_active" className="text-lg font-semibold text-blue-800">Status Aktif</Label>
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                disabled={loading}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-blue-500 data-[state=unchecked]:bg-gray-300"
              />
            </div>
          </div>

          <DialogFooter className="gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1 h-16 text-xl font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1 h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              {loading ? 'Menyimpan...' : isEdit ? 'Update' : '📦 Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
