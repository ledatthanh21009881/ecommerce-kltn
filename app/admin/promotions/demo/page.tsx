export default function DemoPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900">Demo Promotions Page</h1>
      <p className="text-gray-600 mt-2">Trang demo đơn giản</p>
      
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold text-blue-600">SALE20</h3>
          <p className="text-sm text-gray-600">Giảm 20%</p>
          <p className="text-sm text-gray-600">Tối thiểu: 600,000đ</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold text-blue-600">WELCOME100K</h3>
          <p className="text-sm text-gray-600">Giảm 100,000đ</p>
          <p className="text-sm text-gray-600">Tối thiểu: 800,000đ</p>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow border">
          <h3 className="font-semibold text-blue-600">NEWUSER15</h3>
          <p className="text-sm text-gray-600">Giảm 15%</p>
          <p className="text-sm text-gray-600">Tối thiểu: 300,000đ</p>
        </div>
      </div>
    </div>
  )
}
