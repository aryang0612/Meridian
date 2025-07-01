import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import FloatingChat from '../components/FloatingChat'
import ClientLayout from '../components/ClientLayout'
import { FinancialDataProvider } from '../context/FinancialDataContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Meridian AI - Canadian Bookkeeping Automation',
  description: 'AI-powered bank statement processing and categorization for Canadian businesses. Automate your bookkeeping with CRA-compliant export formats.',
  keywords: 'bookkeeping, accounting, AI, Canada, CRA, bank statements, Xero, QuickBooks',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
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