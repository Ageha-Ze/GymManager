'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Pencil, Trash2, Mail, Phone, MapPin, Calendar, User, Plus } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import MembershipDialog from '@/components/memberships/MembershipDialog'

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
  is_active: boolean
}

interface MemberDetailDialogProps {
  open: boolean
  onClose: () => void
  member: Member | null
  onEdit: (member: Member) => void
  onDelete: (member: Member) => void
  onMembershipSuccess?: () => void
}

export default function MemberDetailDialog({
  open,
  onClose,
  member,
  onEdit,
  onDelete,
  onMembershipSuccess
}: MemberDetailDialogProps) {
  const [isMembershipDialogOpen, setIsMembershipDialogOpen] = useState(false)
  if (!member) return null

  const getInitials = (name: string) => {
    if (!name) return 'U'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return format(new Date(dateString), 'dd MMMM yyyy', { locale: idLocale })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-white rounded-2xl shadow-2xl border border-blue-100 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-blue-800 flex items-center gap-3">
            Detail Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header with Photo */}
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 border-4 border-orange-300 shadow-lg">
              <AvatarImage src={member.photo_url || undefined} />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-orange-500 text-white font-bold text-3xl">
                {getInitials(member.full_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-foreground">{member.full_name}</h3>
              <p className="text-lg text-muted-foreground">{member.member_code}</p>
            </div>
          </div>

          <Separator />

          {/* Contact Information */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-foreground">Informasi Kontak</h4>

            <div className="flex items-center gap-3 text-base">
              <Phone className="w-5 h-5 text-muted-foreground" />
              <span className="text-muted-foreground">Telepon:</span>
              <span className="font-medium">{member.phone}</span>
            </div>

            {member.email && (
              <div className="flex items-center gap-3 text-base">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{member.email}</span>
              </div>
            )}

            {member.address && (
              <div className="flex items-start gap-3 text-base">
                <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                <span className="text-muted-foreground">Alamat:</span>
                <span className="font-medium flex-1">{member.address}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Personal Information */}
          <div className="space-y-3">
            <h4 className="text-lg font-semibold text-foreground">Informasi Pribadi</h4>

            <div className="grid grid-cols-2 gap-4 text-base">
              <div>
                <span className="text-muted-foreground">Tanggal Lahir:</span>
                <p className="font-medium">{formatDate(member.date_of_birth)}</p>
              </div>

              <div>
                <span className="text-muted-foreground">Jenis Kelamin:</span>
                <p className="font-medium capitalize">
                  {member.gender === 'male' ? 'Laki-laki' : member.gender === 'female' ? 'Perempuan' : member.gender || '-'}
                </p>
              </div>

              <div>
                <span className="text-muted-foreground">Tanggal Bergabung:</span>
                <p className="font-medium">{formatDate(member.join_date)}</p>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          {(member.emergency_name || member.emergency_contact) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-foreground">Kontak Darurat</h4>

                {member.emergency_name && (
                  <div className="flex items-center gap-3 text-base">
                    <User className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Nama:</span>
                    <span className="font-medium">{member.emergency_name}</span>
                  </div>
                )}

                {member.emergency_contact && (
                  <div className="flex items-center gap-3 text-base">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Telepon:</span>
                    <span className="font-medium">{member.emergency_contact}</span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Notes */}
          {member.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-lg font-semibold text-foreground">Catatan</h4>
                <p className="text-base text-muted-foreground">{member.notes}</p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-6 border-t">
            <Button
              onClick={() => {
                onEdit(member)
                onClose()
              }}
              variant="outline"
              className="flex-1 h-16 text-xl font-semibold border-2 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-xl transition-all duration-300 cursor-pointer"
            >
              <Pencil className="w-6 h-6 mr-3" />
              Edit
            </Button>
            <Button
              onClick={() => setIsMembershipDialogOpen(true)}
              className="flex-1 h-16 text-xl font-bold bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              <Plus className="w-6 h-6 mr-3" />
              Membership
            </Button>
            <Button
              onClick={() => {
                onDelete(member)
                onClose()
              }}
              variant="destructive"
              className="flex-1 h-16 text-xl font-bold bg-red-500 hover:bg-red-600 text-white rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer"
            >
              <Trash2 className="w-6 h-6 mr-3" />
              Hapus
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Membership Dialog */}
      <MembershipDialog
        open={isMembershipDialogOpen}
        onClose={() => setIsMembershipDialogOpen(false)}
        onSuccess={() => {
          setIsMembershipDialogOpen(false)
          onMembershipSuccess?.()
        }}
        member={member}
      />
    </Dialog>
  )
}
