export default function Home() {
  return (
    <main className="min-h-screen overflow-x-hidden">
      {/* Hero Section - Full Screen Video */}
      <section className="relative h-screen w-full overflow-hidden">
        <video
          src="https://res.cloudinary.com/dknwpznzc/video/upload/v1754842411/1_fqyrll.mp4"
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
