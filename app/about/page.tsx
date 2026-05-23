import { getBackendBaseUrl } from '@/app/api/backend/config'
import { storefrontMainClass } from '@/components/storefront/storefront-layout'

const ABOUT_PATH = '/about'

async function getAboutPageHtml(): Promise<string> {
  try {
    const slug = ABOUT_PATH.replace(/^\/+|\/+$/g, '')
    const response = await fetch(`${getBackendBaseUrl()}/api/backend/v1/content/public/slug/${slug}`, {
      cache: 'no-store',
    })
    const payload = await response.json()
    const html = payload?.data?.content

    if (typeof html === 'string' && html.trim()) return html
    return ''
  } catch {
    return ''
  }
}

export default async function AboutPage() {
  const aboutHtml = await getAboutPageHtml()

  return (
    <main className="min-h-screen">
      <div className={storefrontMainClass('font-gotham')}>
        <div
          className="font-gotham text-black text-[17px] leading-[1.8] space-y-6"
          style={{ fontFamily: 'SVN-Gotham' }}
          dangerouslySetInnerHTML={{ __html: aboutHtml }}
        >
        </div>
      </div>
    </main>
  )
}
