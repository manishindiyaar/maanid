import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '../components/theme-provider'
import { AuthProvider } from '../lib/auth/AuthContext'

// Use Google Fonts for better compatibility with Next.js optimization
const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Bladex AI',
  description: 'AI That Knows Your Customers',
  icons: {
    icon: '/bl.png',
    shortcut: '/favicon.ico',
    apple: '/bl.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider defaultTheme="dark">
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  )
}