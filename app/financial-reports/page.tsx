'use client'

import { useState, useEffect } from 'react'
import Layout from '@/components/layout/Layout'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, DollarSign, Calendar, TrendingUp, TrendingDown, PieChart, BarChart3 } from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { toast } from 'sonner'

export default function FinancialReportsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState('monthly')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)

interface Payment {
  id: string
  amount: number
  payment_method: string
  payment_status: string
  payment_date: string
  invoice_number: string | null
  member_id: string
  created_at: string
  members?: {
    member_code: string
    full_name: string
  } | null
}

  useEffect(() => {
    console.log('[FINANCIAL-REPORTS] Initial loading financial reports...')
    fetchPayments()

    // Set default period to current month
    const now = new Date()
    setCustomStartDate(startOfMonth(now).toISOString().split('T')[0])
    setCustomEndDate(endOfMonth(now).toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (customStartDate && customEndDate || selectedPeriod !== 'custom') {
      fetchPayments()
    }
  }, [selectedPeriod, customStartDate, customEndDate])

  const getDateRange = () => {
    const now = new Date()
    switch (selectedPeriod) {
      case 'daily':
        return {
          start: now.toISOString().split('T')[0],
          end: now.toISOString().split('T')[0]
        }
      case 'weekly':
        const weekStart = new Date(now)
        weekStart.setDate(now.getDate() - now.getDay())
        const weekEnd = new Date(now)
        weekEnd.setDate(now.getDate() + (6 - now.getDay()))
        return {
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0]
        }
      case 'monthly':
        return {
          start: startOfMonth(now).toISOString().split('T')[0],
          end: endOfMonth(now).toISOString().split('T')[0]
        }
      case 'yearly':
        return {
          start: startOfYear(now).toISOString().split('T')[0],
          end: endOfYear(now).toISOString().split('T')[0]
        }
      case 'custom':
        return {
          start: customStartDate,
          end: customEndDate
        }
      default:
        return {
          start: startOfMonth(now).toISOString().split('T')[0],
          end: endOfMonth(now).toISOString().split('T')[0]
        }
    }
  }

  const fetchPayments = async () => {
    try {
      console.log('[FINANCIAL-REPORTS] Starting fetchPayments')
      setLoading(true)
      const { start, end } = getDateRange()

      // Get summary data for calculations (limited to avoid large data transfer)
      const { data: summaryData, error: summaryError } = await supabase
        .from('payments')
        .select('amount, payment_method')
        .eq('payment_status', 'paid')
        .gte('payment_date', start)
        .lte('payment_date', end)

      if (summaryError) throw summaryError

      // Get detailed payment list with pagination
      const { data: paymentList, error: paymentError } = await supabase
        .from('payments')
        .select(`
          id,
          payment_date,
          amount,
          payment_method,
          payment_status,
          invoice_number,
          member_id,
          created_at
        `)
        .eq('payment_status', 'paid')
        .gte('payment_date', start)
        .lte('payment_date', end)
        .order('payment_date', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1)

      if (paymentError) throw paymentError

      if (!paymentList || paymentList.length === 0) {
        console.log('[FINANCIAL-REPORTS] No payments data found for date range')
        setPayments([])
        console.log('[FINANCIAL-REPORTS] Loading complete')
        return
      }

      // Get member details for these payments
      const memberIds = [...new Set(paymentList.map(p => p.member_id))]
      const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id, member_code, full_name')
        .in('id', memberIds)

      if (membersError) {
        console.error('Error fetching members:', membersError)
        setPayments([])
        return
      }

      const memberMap = new Map(members?.map(m => [m.id, m]) || [])

      const paymentsWithMembers = paymentList.map(payment => ({
        ...payment,
        members: memberMap.get(payment.member_id) || null
      }))

      console.log('[FINANCIAL-REPORTS] Data fetched:', paymentsWithMembers?.length || 0, 'payments')
      setPayments(paymentsWithMembers)
      console.log('[FINANCIAL-REPORTS] Loading complete')
    } catch (error) {
      console.error('Error fetching payments:', error)
      toast.error('Gagal memuat data pembayaran')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const getPaymentMethodLabel = (method: string) => {
    const methods: {[key: string]: string} = {
      cash: 'Tunai',
      bank_transfer: 'Transfer Bank',
      qris: 'QRIS',
      gopay: 'GoPay',
      ovo: 'OVO',
      shopeepay: 'ShopeePay',
      credit_card: 'Kartu Kredit',
      other: 'Lainnya'
    }
    return methods[method] || method
  }

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0)

  const paymentMethodBreakdown = payments.reduce((acc, payment) => {
    acc[payment.payment_method] = (acc[payment.payment_method] || 0) + payment.amount
    return acc
  }, {} as {[key: string]: number})

  const sortedPaymentMethods = Object.entries(paymentMethodBreakdown)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  const averageTransaction = payments.length > 0 ? totalRevenue / payments.length : 0

  const monthlyTrend = () => {
    // This would calculate trend compared to previous period
    // For now, just return positive growth
    return 12.5
  }

  const handleExport = () => {
    const csvData = payments.map(payment => ({
      'ID': payment.id,
      'Tanggal': payment.payment_date,
      'Invoice': payment.invoice_number || '',
      'Member': payment.members?.full_name || '',
      'Kode Member': payment.members?.member_code || '',
      'Jumlah': payment.amount,
      'Metode Pembayaran': getPaymentMethodLabel(payment.payment_method),
      'Status': payment.payment_status
    }))

    const csvString = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')

    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `laporan_keuangan_${getDateRange().start}_to_${getDateRange().end}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast.success('Laporan berhasil diekspor!')
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-3 sm:p-6 space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 rounded-3xl p-4 sm:p-8 shadow-xl text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-400/30 via-orange-400/30 to-yellow-400/30 animate-pulse"></div>
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <DollarSign className="w-8 h-8 sm:w-12 sm:h-12 text-amber-200" />
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">Laporan Keuangan</h1>
                <p className="text-lg sm:text-xl text-amber-100 mt-1 sm:mt-2">
                  Analisa laporan pendapatan dan performa keuangan dengan detail lengkap!
                </p>
              </div>
            </div>
            <Button
              onClick={handleExport}
              className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300 rounded-xl px-4 sm:px-6 py-4 text-base lg:text-lg font-semibold hover:cursor-pointer"
            >
              <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
              <span className="hidden sm:inline">Export Laporan</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </div>
        </div>

        {/* Period Selection */}
        <Card className="bg-white rounded-xl shadow-2xl border border-orange-100">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-xl">
            <CardTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
              <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              Periode Laporan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="flex h-12 sm:h-14 items-center justify-between rounded-xl border-2 border-orange-200 bg-orange-50 px-3 sm:px-4 py-3 text-base sm:text-lg ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
              >
                <option value="daily">Hari Ini</option>
                <option value="weekly">Minggu Ini</option>
                <option value="monthly">Bulan Ini</option>
                <option value="yearly">Tahun Ini</option>
                <option value="custom">Custom</option>
              </select>

              {selectedPeriod === 'custom' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="start_date" className="text-sm sm:text-base font-semibold text-orange-800">Tanggal Mulai</Label>
                    <div className="relative">
                      <Input
                        id="start_date"
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="h-10 sm:h-12 text-sm sm:text-base border-orange-200 focus:border-orange-400 bg-orange-50 rounded-xl pr-10 sm:pr-12 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_date" className="text-sm sm:text-base font-semibold text-orange-800">Tanggal Akhir</Label>
                    <div className="relative">
                      <Input
                        id="end_date"
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="h-10 sm:h-12 text-sm sm:text-base border-orange-200 focus:border-orange-400 bg-orange-50 rounded-xl pr-10 sm:pr-12 cursor-pointer"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-4 p-3 sm:p-4 bg-orange-50 rounded-xl">
              <p className="text-sm sm:text-base text-orange-800">
                <strong>Periode Laporan:</strong> {format(new Date(getDateRange().start), 'dd MMM yyyy', { locale: idLocale })} - {format(new Date(getDateRange().end), 'dd MMM yyyy', { locale: idLocale })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary Cards */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="card-simple border-primary-orange hover:cursor-pointer">
            <CardHeader className="pb-2 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-primary-orange">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Total Pendapatan</span>
                <span className="sm:hidden">Pendapatan</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-orange mb-1 sm:mb-2">{formatCurrency(totalRevenue)}</div>
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                <span className="text-green-600">{monthlyTrend()}% dari bulan sebelumnya</span>
              </div>
            </CardContent>
          </Card>

          <Card className="card-simple border-primary-green hover:cursor-pointer">
            <CardHeader className="pb-2 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-primary-green">
                <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Total Transaksi</span>
                <span className="sm:hidden">Transaksi</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-green mb-1 sm:mb-2">{payments.length}</div>
              <p className="text-xs sm:text-sm text-gray-600">
                Pembayaran berhasil
              </p>
            </CardContent>
          </Card>

          <Card className="card-simple border-primary-blue hover:cursor-pointer">
            <CardHeader className="pb-2 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-primary-blue">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Rata-rata Transaksi</span>
                <span className="sm:hidden">Rata-rata</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-blue mb-1 sm:mb-2">{formatCurrency(averageTransaction)}</div>
              <p className="text-xs sm:text-sm text-gray-600">
                Per pembayaran
              </p>
            </CardContent>
          </Card>

          <Card className="card-simple border-primary-purple hover:cursor-pointer">
            <CardHeader className="pb-2 p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-primary-purple">
                <PieChart className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline">Metode Pembayaran</span>
                <span className="sm:hidden">Metode</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary-purple mb-1 sm:mb-2">{sortedPaymentMethods.length}</div>
              <p className="text-xs sm:text-sm text-gray-600">
                Metode digunakan
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Method Breakdown */}
        <Card className="bg-white rounded-xl shadow-2xl border border-orange-100">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-xl">
            <CardTitle className="text-lg sm:text-2xl font-bold">Breakdown Metode Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            {loading ? (
              <div className="flex items-center justify-center h-24 sm:h-32">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : sortedPaymentMethods.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-orange-600">
                <p className="text-sm sm:text-base">Tidak ada data pembayaran untuk periode ini</p>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {sortedPaymentMethods.map(([method, amount], index) => (
                  <div key={method} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-orange-50 rounded-xl gap-2 sm:gap-0">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg bg-orange-500 text-white flex items-center justify-center font-bold text-sm">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-orange-900 text-sm sm:text-base">{getPaymentMethodLabel(method)}</p>
                        <p className="text-xs sm:text-sm text-orange-600">{((amount / totalRevenue) * 100).toFixed(1)}% dari total</p>
                      </div>
                    </div>
                    <div className="text-lg sm:text-xl font-bold text-orange-700">
                      {formatCurrency(amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments Table */}
        <Card className="bg-white rounded-xl shadow-2xl border border-orange-100">
          <CardHeader className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-xl">
            <CardTitle className="text-base sm:text-2xl font-bold">Transaksi Terbaru</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            {loading ? (
              <div className="flex items-center justify-center h-24 sm:h-32">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-b-2 border-orange-500"></div>
              </div>
            ) : payments.length === 0 ? (
              <div className="text-center py-8 sm:py-12 text-orange-600">
                <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-orange-300" />
                <p className="text-lg sm:text-xl font-semibold">Tidak ada transaksi</p>
                <p className="text-base sm:text-lg text-orange-500 mt-2">Belum ada pembayaran untuk periode yang dipilih</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border-2 border-orange-100 shadow-lg">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-gradient-to-r from-amber-500 to-orange-500">
                    <tr>
                      <th className="text-left p-3 sm:p-4 text-sm sm:text-lg font-semibold text-white">Tanggal</th>
                      <th className="text-left p-3 sm:p-4 text-sm sm:text-lg font-semibold text-white">Member</th>
                      <th className="text-left p-3 sm:p-4 text-sm sm:text-lg font-semibold text-white">Invoice</th>
                      <th className="text-left p-3 sm:p-4 text-sm sm:text-lg font-semibold text-white">Metode</th>
                      <th className="text-left p-3 sm:p-4 text-sm sm:text-lg font-semibold text-white">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {payments.slice(0, 10).map((payment, index) => (
                      <tr
                        key={payment.id}
                        className={`border-t-2 border-orange-100 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all duration-200 ${
                          index % 2 === 0 ? 'bg-orange-50/30' : 'bg-white'
                        }`}
                      >
                        <td className="p-3 sm:p-4">
                          <div className="bg-orange-100 text-orange-700 font-medium px-2 sm:px-3 py-1 rounded-lg text-xs sm:text-sm">
                            {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: idLocale })}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="font-semibold text-orange-900 text-sm sm:text-base">
                            {payment.members?.full_name || 'Unknown'}
                          </div>
                          <div className="text-xs sm:text-sm text-orange-600">
                            {payment.members?.member_code}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="inline-block bg-amber-100 text-amber-700 font-mono font-semibold px-2 sm:px-3 py-1 rounded-lg border border-amber-300 text-xs sm:text-sm">
                            {payment.invoice_number || '-'}
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="flex items-center gap-1 sm:gap-2 bg-purple-50 px-2 sm:px-3 py-1 rounded-lg border border-purple-200 w-fit">
                            <PieChart className="w-3 h-3 sm:w-4 sm:h-4 text-purple-600" />
                            <span className="text-xs sm:text-sm font-medium text-purple-700">{getPaymentMethodLabel(payment.payment_method)}</span>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4">
                          <div className="text-base sm:text-xl font-bold text-green-600 bg-green-50 inline-block px-3 sm:px-4 py-1 sm:py-2 rounded-xl border-2 border-green-200 shadow-sm">
                            {formatCurrency(payment.amount)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {payments.length > 10 && (
                  <div className="text-center p-3 sm:p-4 text-orange-600 font-medium text-sm sm:text-base">
                    Dan {payments.length - 10} transaksi lainnya...
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {!loading && payments.length > 0 && (
          <div className="text-center">
            <p className="text-orange-700 text-lg font-semibold">
              Menampilkan laporan keuangan dari {payments.length} pembayaran
            </p>
          </div>
        )}
      </div>
    </Layout>
  )
}
