export default function MessengerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen min-h-[100dvh] bg-gray-50">
      {children}
    </div>
  )
}
