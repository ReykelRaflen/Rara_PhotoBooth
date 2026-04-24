import type { Metadata, Viewport } from 'next'
import { Cormorant_Garamond, DM_Sans, DM_Mono } from 'next/font/google'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300','400','500','600','700'],
  style: ['normal','italic'],
  variable: '--font-cormorant',
  display: 'swap',
})
const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300','400','500','600'],
  variable: '--font-dm-sans',
  display: 'swap',
})
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400','500'],
  variable: '--font-dm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: "Idaadarii's Photobooth 🌿",
  description: 'Capture the moment, cherish the magic — a photobooth made with love for Idaadarii.',
  openGraph: {
    title: "Idaadarii's Photobooth",
    description: 'Capture the moment, cherish the magic.',
    type: 'website',
  },
}

export const viewport: Viewport = {
  themeColor: '#7aaf56',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${cormorant.variable} ${dmSans.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
