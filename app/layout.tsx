import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import SignInButton from '@/components/SignInButton'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Riders Scan - Honest Driver Reviews',
  description: 'Find honest reviews and ratings for local drivers. Make informed decisions about your ride.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen bg-background">
            <header className="fixed top-0 left-0 right-0 bg-background border-b z-40">
              <div className="container mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-primary">
                      🚗 Riders Scan
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Honest driver reviews for informed decisions
                    </p>
                  </div>
                  <SignInButton />
                </div>
              </div>
            </header>
            <main className="pt-20">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
