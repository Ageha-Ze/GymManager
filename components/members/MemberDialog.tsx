'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Upload, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

interface Member {
  id: string
  member_code: string
  full_name: string
  phone: string
  email: string | null
  date_of_birth: string | null
  gender: 'male' | 'female' | 'other' | null
  address: string | null
  emergency_contact: string | null
  emergency_name: string | null
  join_date: string
  photo_url: string | null
  notes: string | null
}

interface MemberDialogProps {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  member?: Member | null
  isEdit?: boolean
}

export default function MemberDialog({ open, onClose, onSuccess, member = null, isEdit = false }: MemberDialogProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState('')

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    date_of_birth: '',
    gender: '',
    address: '',
    emergency_contact: '',
    emergency_name: '',
    join_date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  useEffect(() => {
    if (member && isEdit) {
      setFormData({
        full_name: member.full_name || '',
        phone: member.phone || '',
        email: member.email || '',
        date_of_birth: member.date_of_birth || '',
        gender: member.gender || '',
        address: member.address || '',
        emergency_contact: member.emergency_contact || '',
        emergency_name: member.emergency_name || '',
        join_date: member.join_date || new Date().toISOString().split('T')[0],
        notes: member.notes || ''
      })
      setPhotoPreview(member.photo_url || '')
    } else {
      resetForm()
    }
  }, [member, isEdit, open])

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      date_of_birth: '',
      gender: '',
      address: '',
      emergency_contact: '',
      emergency_name: '',
      join_date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setPhotoFile(null)
    setPhotoPreview('')
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 2MB')
        return
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast.error('Format file harus JPG atau PNG')
        return
      }
      setPhotoFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    }
  }

  const uploadPhoto = async () => {
    if (!photoFile) return null

    try {
      setUploading(true)
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('member-photos')
        .upload(filePath, photoFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('member-photos')
        .getPublicUrl(filePath)

      return publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      toast.error('Gagal upload foto')
      return null
    } finally {
      setUploading(false)
    }
  }

  const generateMemberCode = async () => {
    try {
      const { data, error } = await supabase
        .rpc('generate_member_code')

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error generating member code:', error)
      // Fallback: generate simple code based on count
      const { count } = await supabase
        .from('members')
        .select('*', { count: 'exact', head: true })
      return `GYM${String((count || 0) + 1).padStart(4, '0')}`
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Upload photo if new file selected
      let photoUrl = photoPreview
      if (photoFile) {
        const uploadedUrl = await uploadPhoto()
        if (uploadedUrl) {
          photoUrl = uploadedUrl
        }
      }

      if (isEdit && member) {
        // Update member
        const { error } = await supabase
          .from('members')
          .update({
            ...formData,
            photo_url: photoUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', member.id)

        if (error) throw error
      } else {
        // Create new member
        const memberCode = await generateMemberCode()

        const { error } = await supabase
          .from('members')
          .insert({
            ...formData,
            member_code: memberCode,
            photo_url: photoUrl,
            created_by: user?.id
          })

        if (error) throw error
      }

      onSuccess()
      resetForm()
    } catch (error) {
      console.error('Error saving member:', error)
      toast.error(isEdit ? 'Gagal update member' : 'Gagal menambah member')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-blue-800 flex items-center gap-3">
            👤 {isEdit ? 'Edit Member' : 'Tambah Member Baru'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
           {/* Photo Upload */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="w-24 h-24 border-4 border-orange-300 shadow-lg">
              {photoPreview && <AvatarImage src={photoPreview} />}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-orange-500 text-white font-bold text-3xl">
                {getInitials(formData.full_name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <Input
                type="file"
                accept="image/jpeg,image/png"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
                disabled={loading || uploading}
              />
              <Label htmlFor="photo-upload" className="cursor-pointer">
                <Button type="button" variant="outline" asChild disabled={loading || uploading}>
                  <span>
                    <Upload className="w-4 h-4 mr-2" />
                    {uploading ? 'Uploading...' : 'Upload Foto'}
                  </span>
                </Button>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">Max 2MB, JPG/PNG</p>
            </div>
          </div>

          {/* Required Fields */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-base">Nama Lengkap *</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="h-12 text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base">Telepon *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="081234567890"
                  required
                  className="h-12 text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="h-12 text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl cursor-pointer"
                  disabled={loading}
                />
              </div>

             <div className="space-y-2">
  <Label htmlFor="join_date" className="text-base">Tanggal Bergabung *</Label>
  <div className="relative">
    <Input
      id="join_date"
      type="date"
      value={formData.join_date}
      onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
      required
      className="h-12 text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl pr-12 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden"
      disabled={loading}
    />
    <div 
      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
      onClick={() => {
        const input = document.getElementById('join_date') as HTMLInputElement
        input?.showPicker?.()
      }}
    >
      <Calendar className="w-5 h-5 text-blue-600" />
    </div>
  </div>
</div>
</div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  <div className="space-y-2">
  <Label htmlFor="date_of_birth" className="text-base">Tanggal Lahir</Label>
  <div className="relative">
    <Input
      id="date_of_birth"
      type="date"
      value={formData.date_of_birth}
      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
      className="h-12 text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl pr-12 cursor-pointer [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden [&::-webkit-clear-button]:hidden"
      disabled={loading}
    />
    <div 
      className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
      onClick={() => {
        const input = document.getElementById('date_of_birth') as HTMLInputElement
        input?.showPicker?.()
      }}
    >
      <Calendar className="w-5 h- text-blue-600" />
    </div>
  </div>
</div>
  

              <div className="space-y-2">
                <Label htmlFor="gender" className="text-base">Jenis Kelamin</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value })}
                  disabled={loading}
                >
                  <SelectTrigger className="h-12 text-base border-blue-200 focus:border-orange-400 rounded-xl bg-blue-100 cursor-pointer">
                    <SelectValue placeholder="Pilih jenis kelamin" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-blue-200 rounded-lg shadow-lg">
                    <SelectItem value="male">Laki-laki</SelectItem>
                    <SelectItem value="female">Perempuan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-base">Alamat</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emergency_name" className="text-base">Nama Kontak Darurat</Label>
                <Input
                  id="emergency_name"
                  value={formData.emergency_name}
                  onChange={(e) => setFormData({ ...formData, emergency_name: e.target.value })}
                  className="h-12 text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl"
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emergency_contact" className="text-base">Telepon Kontak Darurat</Label>
                <Input
                  id="emergency_contact"
                  type="tel"
                  value={formData.emergency_contact}
                  onChange={(e) => setFormData({ ...formData, emergency_contact: e.target.value })}
                  placeholder="081234567890"
                  className="h-12 text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-base">Catatan</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="text-base border-blue-200 focus:border-orange-400 bg-blue-50 rounded-xl"
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="gap-4 pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading || uploading}
              className="flex-1 h-16 text-xl font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 cursor-pointer"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={loading || uploading}
              className="flex-1 h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              {loading ? 'Menyimpan...' : isEdit ? 'Update' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
