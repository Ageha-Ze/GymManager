'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

interface Payment {
  id: string
  invoice_number: string | null
  payment_date: string
  amount: number
  payment_method: string
  payment_status: string
  members?: {
    member_code: string
    full_name: string
    phone: string
    photo_url: string | null
  } | null
  member_memberships?: {
    start_date: string
    end_date: string
    membership_packages?: {
      package_name: string
    }
  }
}

interface InvoicePrintProps {
  payment: Payment
  onPrint?: () => void
}

export default function InvoicePrint({ payment, onPrint }: InvoicePrintProps) {
  if (!payment) return null

  const { formatCurrency } = {
    formatCurrency: (amount: number) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(amount)
  }

  const formatDate = (dateString: string) =>
    format(new Date(dateString), 'dd MMMM yyyy', { locale: idLocale })

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${payment.invoice_number}</title>
          <meta charset="UTF-8">
          <style>
            @page { size: A4; margin: 15mm; }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              font-size: 13px;
              line-height: 1.6;
              color: #333;
              background: #f8f9fa;
            }
            .invoice-container {
              max-width: 800px;
              margin: 20px auto;
              background: white;
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
            }
            .header {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 40px;
              position: relative;
              overflow: hidden;
            }
            .header::before {
              content: '';
              position: absolute;
              top: -50%;
              right: -10%;
              width: 300px;
              height: 300px;
              background: rgba(255,255,255,0.1);
              border-radius: 50%;
            }
            .header-content {
              position: relative;
              z-index: 1;
            }
            .logo {
              font-size: 32px;
              font-weight: 800;
              margin-bottom: 15px;
              letter-spacing: 1px;
            }
            .company-info {
              font-size: 14px;
              line-height: 1.8;
              opacity: 0.95;
            }
            .invoice-title-section {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 30px 40px;
              background: #f8f9fa;
              border-bottom: 3px solid #667eea;
            }
            .invoice-title {
              font-size: 36px;
              font-weight: 700;
              color: #667eea;
            }
            .invoice-number {
              text-align: right;
            }
            .invoice-number-label {
              font-size: 12px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .invoice-number-value {
              font-size: 20px;
              font-weight: 700;
              color: #333;
              font-family: 'Courier New', monospace;
            }
            .info-section {
              display: flex;
              padding: 40px;
              gap: 40px;
            }
            .info-box {
              flex: 1;
              background: #f8f9fa;
              padding: 25px;
              border-radius: 10px;
              border-left: 4px solid #667eea;
            }
            .info-box-title {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 1.5px;
              color: #667eea;
              font-weight: 700;
              margin-bottom: 15px;
            }
            .info-row {
              display: flex;
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: 600;
              color: #666;
              min-width: 140px;
            }
            .info-value {
              color: #333;
              font-weight: 500;
            }
            .details-section {
              padding: 0 40px 40px;
            }
            table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              margin-bottom: 30px;
              border-radius: 10px;
              overflow: hidden;
              box-shadow: 0 2px 10px rgba(0,0,0,0.08);
            }
            thead {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            th {
              padding: 18px;
              text-align: left;
              font-weight: 600;
              font-size: 13px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            tbody tr {
              background: white;
              border-bottom: 1px solid #e9ecef;
            }
            tbody tr:last-child {
              border-bottom: none;
            }
            td {
              padding: 20px 18px;
              color: #333;
            }
            .amount-cell {
              text-align: right;
              font-weight: 700;
              font-size: 16px;
              color: #667eea;
            }
            .total-section {
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              padding: 30px;
              border-radius: 10px;
              margin: 0 40px 30px;
              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
            }
            .total-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .total-label {
              font-size: 16px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 2px;
            }
            .total-amount {
              font-size: 32px;
              font-weight: 800;
            }
            .status-section {
              text-align: center;
              margin-top: 20px;
            }
            .paid-badge {
              display: inline-block;
              background: #10b981;
              color: white;
              padding: 12px 30px;
              border-radius: 50px;
              font-weight: 700;
              font-size: 14px;
              text-transform: uppercase;
              letter-spacing: 1px;
              box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
            }
            .footer {
              background: #f8f9fa;
              padding: 30px 40px;
              text-align: center;
              border-top: 1px solid #e9ecef;
            }
            .footer-message {
              font-size: 16px;
              color: #667eea;
              font-weight: 600;
              margin-bottom: 10px;
            }
            .footer-submessage {
              font-size: 14px;
              color: #666;
              margin-bottom: 15px;
            }
            .footer-timestamp {
              font-size: 11px;
              color: #999;
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid #dee2e6;
            }
            @media print {
              body { background: white; }
              .invoice-container { box-shadow: none; margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <div class="header">
              <div class="header-content">
                <div class="logo">IHSAN SPORT CENTER</div>
                <div class="company-info">
                  📍 Jl. Wonosalam No.Rt05/Rw 09, Wonosalam, Sukoharjo<br>
                  Kec. Ngaglik, Kab. Sleman, D.I. Yogyakarta 55581<br>
                  📞 0851-9125-8786 | 📷 @ihsansportisc
                </div>
              </div>
            </div>

            <div class="invoice-title-section">
              <div class="invoice-title">INVOICE</div>
              <div class="invoice-number">
                <div class="invoice-number-label">Invoice Number</div>
                <div class="invoice-number-value">${payment.invoice_number}</div>
              </div>
            </div>

            <div class="info-section">
              <div class="info-box">
                <div class="info-box-title">📋 Detail Invoice</div>
                <div class="info-row">
                  <div class="info-label">Tanggal:</div>
                  <div class="info-value">${formatDate(payment.payment_date)}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Metode Pembayaran:</div>
                  <div class="info-value">${
                    payment.payment_method === 'cash' ? '💵 Tunai' :
                    payment.payment_method === 'bank_transfer' ? '🏦 Transfer Bank' :
                    payment.payment_method === 'qris' ? '📱 QRIS' :
                    payment.payment_method === 'gopay' ? '💚 GoPay' :
                    payment.payment_method === 'ovo' ? '💜 OVO' :
                    payment.payment_method === 'shopeepay' ? '🧡 ShopeePay' :
                    payment.payment_method === 'credit_card' ? '💳 Kartu Kredit' :
                    '🔹 ' + (payment.payment_method || 'Lainnya')
                  }</div>
                </div>
              </div>

              <div class="info-box">
                <div class="info-box-title">👤 Detail Member</div>
                <div class="info-row">
                  <div class="info-label">Nama:</div>
                  <div class="info-value">${payment.members?.full_name}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Kode Member:</div>
                  <div class="info-value">${payment.members?.member_code}</div>
                </div>
                <div class="info-row">
                  <div class="info-label">Telepon:</div>
                  <div class="info-value">${payment.members?.phone}</div>
                </div>
              </div>
            </div>

            <div class="details-section">
              <table>
                <thead>
                  <tr>
                    <th>Deskripsi</th>
                    <th>Periode</th>
                    <th style="text-align: right">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>${payment.member_memberships?.membership_packages?.package_name || 'Membership Package'}</strong>
                    </td>
                    <td>
                      ${payment.member_memberships ?
                        formatDate(payment.member_memberships.start_date) + ' - ' + formatDate(payment.member_memberships.end_date) :
                        'N/A'
                      }
                    </td>
                    <td class="amount-cell">
                      ${formatCurrency(payment.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="total-section">
              <div class="total-row">
                <div class="total-label">Total Pembayaran</div>
                <div class="total-amount">${formatCurrency(payment.amount)}</div>
              </div>
              <div class="status-section">
                <span class="paid-badge">
                  ${payment.payment_status === 'paid' ? '✅ SUDAH DIBAYAR' :
                    payment.payment_status === 'pending' ? '⏳ MENUNGGU KONFIRMASI' :
                    payment.payment_status === 'failed' ? '❌ GAGAL' :
                    payment.payment_status === 'refunded' ? '↩️ DIKEMBALIKAN' :
                    payment.payment_status.toUpperCase()}
                </span>
              </div>
            </div>

            <div class="footer">
              <div class="footer-message">🙏 Terima kasih atas pembayaran Anda!</div>
              <div class="footer-submessage">Keep training, stay healthy! 💪</div>
              <div class="footer-timestamp">
                Invoice dicetak pada ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: idLocale })}
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(invoiceHTML)
    printWindow.document.close()
    printWindow.focus()

    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }

  return (
    <Button 
  onClick={handlePrint} 
  size="sm"
  className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-300 hover:border-blue-700 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg cursor-pointer"
>
  <Printer className="w-4 h-4" />
</Button>
  )
}
