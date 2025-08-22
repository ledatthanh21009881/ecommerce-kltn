# Auto Refresh Token System

## Tổng quan

Hệ thống auto refresh token được thiết kế để tự động làm mới access token khi nó sắp hết hạn, giúp người dùng không bị văng ra đăng nhập.

## Các thành phần chính

### 1. TokenManager (`web/lib/token-manager.ts`)
- Quản lý access token và refresh token
- Tự động kiểm tra token expiration
- Xử lý refresh token khi cần thiết

### 2. ApiClient (`web/lib/api-client.ts`)
- HTTP client với interceptor tự động
- Tự động thêm Authorization header
- Tự động refresh token khi nhận 401 response

### 3. TokenRefreshProvider (`web/components/token-refresh-provider.tsx`)
- Provider component để quản lý auto refresh
- Kiểm tra token mỗi 5 phút
- Tự động redirect về login nếu refresh thất bại

### 4. useApi Hook (`web/hooks/use-api.ts`)
- Hook để sử dụng API với auto refresh
- Xử lý loading state và error handling
- Tự động redirect khi session hết hạn

## Cách sử dụng

### 1. Đăng nhập
```typescript
import { loginUser } from '@/lib/auth'

const response = await loginUser({
  account_name: 'admin',
  password: 'admin123'
})

// Token và refresh token sẽ được tự động lưu bởi TokenManager
```

### 2. Gọi API với auto refresh
```typescript
import { apiClient } from '@/lib/api-client'

// Tự động thêm Authorization header và refresh token nếu cần
const response = await apiClient.get('/categories')
```

### 3. Sử dụng useApi hook
```typescript
import { useApi } from '@/hooks/use-api'

function MyComponent() {
  const { get, post, loading, error } = useApi({
    onError: (error) => console.error('API Error:', error),
    onSuccess: (data) => console.log('API Success:', data)
  })

  const fetchData = async () => {
    const data = await get('/categories')
    // Tự động xử lý refresh token nếu cần
  }

  return (
    <div>
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      <button onClick={fetchData}>Fetch Data</button>
    </div>
  )
}
```

### 4. Logout
```typescript
import { authUtils } from '@/lib/auth'

// Sẽ gọi API logout và xóa tất cả token
await authUtils.logout()
```

## Cấu hình

### Token Expiration
- Access Token: 1 giờ
- Refresh Token: 30 ngày
- Buffer time: 5 phút (refresh trước khi hết hạn)

### Auto Check Interval
- Kiểm tra token mỗi 5 phút
- Có thể điều chỉnh trong `TokenRefreshProvider`

## API Endpoints

### Login
```
POST /api/v1/auth/login
POST /api/v1/auth/admin/login
```

Response:
```json
{
  "success": true,
  "data": {
    "token": "access_token_here",
    "refresh_token": "refresh_token_here",
    "user": { ... }
  }
}
```

### Refresh Token
```
POST /api/v1/auth/refresh-advanced
```

Request:
```json
{
  "refresh_token": "refresh_token_here"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "access_token": "new_access_token",
    "refresh_token": "new_refresh_token"
  }
}
```

### Logout
```
POST /api/v1/auth/logout-advanced
```

Request:
```json
{
  "refresh_token": "refresh_token_here"
}
```

## Test

Truy cập `http://localhost:3001/test-token` để test hệ thống token:

- Xem thông tin token hiện tại
- Test API call với auto refresh
- Test refresh token thủ công
- Clear tokens

## Lưu ý

1. **Security**: Refresh token được rotate mỗi lần refresh để tăng bảo mật
2. **Error Handling**: Tự động redirect về login khi refresh thất bại
3. **Performance**: Chỉ refresh khi cần thiết, tránh spam API
4. **Compatibility**: Hỗ trợ cả access_token và token field names

## Troubleshooting

### Token không được lưu
- Kiểm tra localStorage có hoạt động không
- Kiểm tra response format từ API

### Refresh token thất bại
- Kiểm tra refresh token có hợp lệ không
- Kiểm tra database connection
- Kiểm tra API endpoint có đúng không

### Auto refresh không hoạt động
- Kiểm tra TokenRefreshProvider có được wrap đúng không
- Kiểm tra interval có chạy không
- Kiểm tra console logs
