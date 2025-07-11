import type { Metadata } from 'next'
import './globals.css'
import FloatingChat from '../components/FloatingChat'
import ClientLayout from '../components/ClientLayout'
import StorageIndicator from '../components/StorageIndicator'
import { FinancialDataProvider } from '../context/FinancialDataContext'
import { AuthProvider } from '../context/AuthContext'

export const metadata: Metadata = {
  title: 'Meridian AI - Canadian Bookkeeping Automation',
  description: 'AI-powered bank statement processing and categorization for Canadian businesses. Automate your bookkeeping with CRA-compliant export formats.',
  keywords: 'bookkeeping, accounting, AI, Canada, CRA, bank statements, Xero, QuickBooks',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <FinancialDataProvider>
            <ClientLayout>
              {children}
              <FloatingChat />
              <StorageIndicator />
            </ClientLayout>
          </FinancialDataProvider>
        </AuthProvider>
      </body>
    </html>
  )
} 