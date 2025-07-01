import type { Metadata } from 'next'
import './globals.css'
import FloatingChat from '../components/FloatingChat'
import ClientLayout from '../components/ClientLayout'
import { FinancialDataProvider } from '../context/FinancialDataContext'

export const metadata: Metadata = {
  title: 'Meridian AI - Canadian Bookkeeping Automation',
  description: 'AI-powered bank statement processing and categorization for Canadian businesses. Automate your bookkeeping with CRA-compliant export formats.',
  keywords: 'bookkeeping, accounting, AI, Canada, CRA, bank statements, Xero, QuickBooks',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FinancialDataProvider>
          <ClientLayout>
            {children}
            <FloatingChat />
          </ClientLayout>
        </FinancialDataProvider>
      </body>
    </html>
  )
} 