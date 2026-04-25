const DEFAULT_VIDEO_URL = 'https://res.cloudinary.com/dknwpznzc/video/upload/v1754842411/1_fqyrll.mp4'
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

async function getHomepageVideoUrl(): Promise<string> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/backend/v1/content/public/slug/home-hero-video`, {
      cache: 'no-store',
    })
    const payload = await response.json()

    const content = payload?.data
    if (!content) return DEFAULT_VIDEO_URL

    let configVideoUrl: string | undefined
    if (typeof content.content === 'string') {
      try {
        const parsed = JSON.parse(content.content)
        configVideoUrl = typeof parsed?.videoUrl === 'string' ? parsed.videoUrl : undefined
      } catch {
        configVideoUrl = undefined
      }
    }

    if (configVideoUrl && configVideoUrl.trim()) return configVideoUrl
    if (typeof content.featured_image === 'string' && content.featured_image.trim()) return content.featured_image

    return DEFAULT_VIDEO_URL
  } catch {
    return DEFAULT_VIDEO_URL
  }
}

export default async function Home() {
  const videoUrl = await getHomepageVideoUrl()

  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Hero Section - Full Screen Video */}
      <section className="relative h-screen w-full overflow-hidden">
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 object-cover w-full h-full"
        />
        <div className="absolute inset-0 bg-black/20" />
      </section>
    </main>
  )
}
