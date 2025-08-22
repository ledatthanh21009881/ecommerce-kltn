# 🛍️ Admin Product Management Interface

Giao diện quản lý sản phẩm đẹp và thân thiện người dùng, được xây dựng với Next.js, Tailwind CSS và shadcn/ui.

## ✨ Tính năng chính

### 📊 Dashboard
- **Thống kê tổng quan**: Tổng số sản phẩm, sản phẩm hoạt động, sản phẩm nổi bật, số lượng danh mục
- **Giao diện responsive**: Hoạt động tốt trên desktop, tablet và mobile
- **Loading states**: Hiển thị trạng thái loading khi tải dữ liệu

### 🛍️ Quản lý sản phẩm
- **Xem danh sách**: Hiển thị sản phẩm dạng grid với hình ảnh và thông tin chi tiết
- **Tìm kiếm**: Tìm kiếm theo tên sản phẩm hoặc mô tả
- **Lọc theo danh mục**: Lọc sản phẩm theo danh mục
- **Thêm sản phẩm**: Form đầy đủ với upload ảnh lên Cloudinary
- **Sửa sản phẩm**: Chỉnh sửa thông tin sản phẩm và ảnh
- **Xóa sản phẩm**: Xóa sản phẩm với xác nhận

### 🖼️ Quản lý ảnh
- **Upload ảnh**: Hỗ trợ upload nhiều ảnh cùng lúc
- **Cloudinary integration**: Tự động upload ảnh lên Cloudinary
- **Preview ảnh**: Xem trước ảnh đã chọn
- **Xóa ảnh**: Xóa ảnh không mong muốn

### 📦 Quản lý biến thể
- **Thêm biến thể**: Thêm nhiều size (S, M, L, XL) cho sản phẩm
- **SKU tự động**: Tạo SKU cho từng biến thể
- **Quản lý tồn kho**: Theo dõi số lượng tồn kho theo từng size
- **Trạng thái biến thể**: In stock, Out of stock, Low stock

## 🚀 Cách sử dụng

### 1. Khởi động ứng dụng
```bash
cd web
npm run dev
```

### 2. Truy cập admin panel
- Mở trình duyệt và truy cập: `http://localhost:3000/admin-login`
- Đăng nhập với thông tin mặc định:
  - **Username**: `admin`
  - **Password**: `admin123`

### 3. Quản lý sản phẩm
- Sau khi đăng nhập, bạn sẽ được chuyển đến trang quản lý sản phẩm
- Sử dụng các tính năng:
  - **Add Product**: Thêm sản phẩm mới
  - **Edit**: Chỉnh sửa sản phẩm (click vào ảnh sản phẩm)
  - **Delete**: Xóa sản phẩm (click vào ảnh sản phẩm)
  - **Search**: Tìm kiếm sản phẩm
  - **Filter**: Lọc theo danh mục

## 🎨 Giao diện

### Design System
- **Colors**: Sử dụng palette màu slate với accent blue
- **Typography**: Font system với các cấp độ rõ ràng
- **Spacing**: Consistent spacing với Tailwind CSS
- **Shadows**: Subtle shadows cho depth và hierarchy

### Components
- **Cards**: Hiển thị thông tin sản phẩm
- **Modals**: Form thêm/sửa sản phẩm
- **Buttons**: Các action buttons với states khác nhau
- **Badges**: Hiển thị trạng thái và tags
- **Dropdowns**: Menu actions cho sản phẩm

### Responsive Design
- **Mobile**: Single column layout với mobile menu
- **Tablet**: 2-3 columns grid
- **Desktop**: 4 columns grid với sidebar

## 🔧 Cấu trúc code

### Pages
```
web/app/admin/
├── layout.tsx          # Admin layout với sidebar
├── page.tsx           # Dashboard (redirect to products)
└── products/
    └── page.tsx       # Product management page
```

### Components
```
web/components/admin/
├── ProductGrid.tsx    # Grid hiển thị sản phẩm
└── ProductModal.tsx   # Modal thêm/sửa sản phẩm
```

### Types
```
web/lib/types.ts       # TypeScript interfaces
```

## 🔌 API Integration

### Endpoints
- `GET /api/backend/v1/products` - Lấy danh sách sản phẩm
- `POST /api/backend/v1/products` - Thêm sản phẩm mới
- `PUT /api/backend/v1/products/{id}` - Cập nhật sản phẩm
- `DELETE /api/backend/v1/products/{id}` - Xóa sản phẩm
- `GET /api/backend/v1/categories` - Lấy danh sách danh mục

### Authentication
- Sử dụng JWT token lưu trong localStorage
- Auto-redirect to login nếu chưa đăng nhập
- Token được gửi trong header Authorization

## 🎯 Tính năng nổi bật

### 1. Upload ảnh thông minh
- Hỗ trợ drag & drop
- Preview ảnh trước khi upload
- Tự động upload lên Cloudinary
- Hiển thị progress và error states

### 2. Form validation
- Validate required fields
- Real-time validation
- Error messages rõ ràng
- Disable submit khi form invalid

### 3. User Experience
- Loading states cho tất cả actions
- Toast notifications cho feedback
- Smooth animations và transitions
- Keyboard shortcuts (ESC để đóng modal)

### 4. Performance
- Lazy loading cho images
- Optimized re-renders
- Efficient state management
- Minimal bundle size

## 🛠️ Development

### Prerequisites
- Node.js 18+
- npm hoặc yarn
- Backend API running trên port 8000

### Setup
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Environment Variables
Tạo file `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## 📱 Mobile Support

Giao diện được tối ưu cho mobile với:
- Touch-friendly buttons
- Swipe gestures
- Responsive images
- Mobile-first design
- Optimized loading times

## 🔒 Security

- JWT token authentication
- CSRF protection
- Input sanitization
- Secure file uploads
- HTTPS enforcement

## 🎨 Customization

### Themes
Có thể dễ dàng thay đổi theme bằng cách modify:
- `tailwind.config.ts` - Colors và spacing
- `globals.css` - Custom CSS variables
- Component styles trong từng file

### Branding
- Logo và favicon trong `public/`
- Color scheme trong theme config
- Typography trong Tailwind config

## 📈 Analytics

Giao diện hỗ trợ tích hợp analytics:
- Page views tracking
- User interactions
- Performance metrics
- Error tracking

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
vercel --prod
```

### Other Platforms
- Netlify
- AWS Amplify
- DigitalOcean App Platform
- Heroku

## 🤝 Contributing

1. Fork repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Happy coding! 🎉**
