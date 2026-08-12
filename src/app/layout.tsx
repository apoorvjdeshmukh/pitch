import type { Metadata, Viewport } from 'next'
import './globals.css'
import { AppProvider } from '@/context/AppContext'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import LoadingOverlay from '@/components/LoadingOverlay'
import ToastHost from '@/components/ToastHost'
import RippleEffect from '@/components/RippleEffect'
import OnboardingGate from '@/components/OnboardingGate'
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: 'Pitch',
  description: 'Round-specific interview prep that compounds across every job.',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/favicon-32.png', sizes: '32x32', type: 'image/png' }],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    title: 'Pitch',
    statusBarStyle: 'default',
  },
}

export const viewport: Viewport = {
  themeColor: '#3E6B5E',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProvider>
          <ServiceWorkerRegister />
          <RippleEffect />
          <LoadingOverlay />
          <ToastHost />
          <OnboardingGate />
          <Sidebar />
          <div id="app-main">
            {children}
          </div>
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  )
}
