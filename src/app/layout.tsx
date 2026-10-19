import { COMMUNITY } from '@/config/community'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import './globals.css'
import { APPEARANCE_SCRIPT } from '@/lib/appearance'
import { AppearanceControl } from '@/components/AppearanceControl'

const shareDescription = `Where community ${COMMUNITY.memberPlural} share ideas, offer help, and build things together.`
const shareImage = { url: `${COMMUNITY.canonicalOrigin}/images/commons-share.png`, width: 1200, height: 630, alt: `${COMMUNITY.name}. ${COMMUNITY.heroHeadline}` }

export const metadata: Metadata = {
  metadataBase: new URL(COMMUNITY.canonicalOrigin),
  openGraph: { title: `${COMMUNITY.name} — ${COMMUNITY.heroHeadline}`, description: shareDescription, url: `${COMMUNITY.canonicalOrigin}/`, siteName: COMMUNITY.name, type: 'website', images: [shareImage] },
  twitter: { card: 'summary_large_image', title: `${COMMUNITY.name} — ${COMMUNITY.heroHeadline}`, description: shareDescription, images: [{ url: shareImage.url, alt: shareImage.alt }] },
  title: `${COMMUNITY.name} community board`,
  description: shareDescription,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} /><link rel="alternate" type="application/rss+xml" title={`${COMMUNITY.name} public posts`} href="/feed.xml" /></head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <div className="flex-1">{children}</div>
        <footer className="commons-footer mx-auto w-full max-w-6xl">
          <div className="commons-footer-art" aria-hidden="true">
            <Image src="/images/fellowship-footer.webp" alt="" width={2172} height={724} unoptimized loading="lazy" />
          </div>
          <div className="commons-footer-content page-inset">
            <div className="commons-footer-grid">
              <div>
                <p>
                  Support or login issues?{' '}
                  <a className="inline-block underline underline-offset-4" href={`mailto:${COMMUNITY.supportEmail}`}>
                    {COMMUNITY.supportEmail}
                  </a>
                </p>
              </div>
              <nav className="commons-footer-policies" aria-label="Help and policies">
                <Link href="/faq">FAQ</Link>
                <Link href="/privacy">Privacy policy</Link>
                <Link href="/terms">Terms of service</Link>
              </nav>
            </div>
            <hr className="commons-footer-rule" />
            <p>
              Built on Commons by{' '}
              <a className="underline underline-offset-4" href="https://github.com/BigLeverVentures/Commons">
                Big Lever Ventures
              </a>
            </p>
            <div className="footer-appearance"><AppearanceControl /></div>
          </div>
        </footer>
      </body>
    </html>
  )
}
