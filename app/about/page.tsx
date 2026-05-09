const BACKEND_URL = process.env.BACKEND_URL || 'http://103.90.225.212:8000'
const ABOUT_PATH = '/about'

async function getAboutPageHtml(): Promise<string> {
  try {
    const slug = ABOUT_PATH.replace(/^\/+|\/+$/g, '')
    const response = await fetch(`${BACKEND_URL}/api/backend/v1/content/public/slug/${slug}`, {
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
      <div className="ml-[224px] pl-[24px] pt-[26px] pb-[87px] pr-12 font-gotham">
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
