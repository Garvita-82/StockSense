import type { Metadata, Viewport } from 'next'
import { AppShell } from '@/components/shell/app-shell'
import { themeInitScript } from '@/lib/theme-script'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Stockline — Inventory & Warehouse Operations',
    template: '%s · Stockline',
  },
  description:
    'Track on-hand stock, receipts, delivery orders, adjustments, and a full stock movement ledger across warehouses.',
  generator: 'v0.app',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#16181d' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
