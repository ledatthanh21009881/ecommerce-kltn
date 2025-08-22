# API Documentation - Product Price Fields Update

## 📋 Thông tin cập nhật

Đã bổ sung **3 trường giá** mới vào bảng `products` và API tương ứng:

### 🏷️ Các trường giá mới:

1. **`list_price`** (DECIMAL 10,2) - Giá niêm yết mặc định ở cấp sản phẩm
2. **`compare_at_price`** (DECIMAL 10,2) - Giá gốc/giá so sánh để hiển thị giảm giá  
3. **`cost_price`** (DECIMAL 10,2) - Giá vốn tham khảo ở cấp sản phẩm (default: 0)

---

## 🛠️ API Endpoints đã cập nhật

### 1. **POST** `/api/v1/products` - Tạo sản phẩm mới

**Request Body (JSON):**
```json
{
  "product_name": "Áo Thun Premium",
  "category_id": 1,
  "short_description": "Áo thun chất lượng cao",
  "description": "Mô tả chi tiết sản phẩm",
  "material": "Cotton 100%",
  "list_price": 299000,        ← Mới
  "compare_at_price": 350000,  ← Mới  
  "cost_price": 150000,        ← Mới
  "is_featured": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "product_id": 38,
    "product_name": "Áo Thun Premium",
    "list_price": "299000.00",
    "compare_at_price": "350000.00", 
    "cost_price": "150000.00",
    // ... other fields
  }
}
```

### 2. **PUT** `/api/v1/products/{id}` - Cập nhật sản phẩm

**Request Body (JSON):**
```json
{
  "list_price": 320000,
  "compare_at_price": 380000,
  "cost_price": 160000
}
```

### 3. **GET** `/api/v1/products/{id}` - Xem chi tiết sản phẩm

**Response bao gồm các trường giá:**
```json
{
  "success": true,
  "data": {
    "product_id": 38,
    "product_name": "Áo Thun Premium",
    "list_price": "320000.00",      ← Giá niêm yết
    "compare_at_price": "380000.00", ← Giá gốc
    "cost_price": "160000.00",       ← Giá vốn
    "min_price": "250000.00",        ← Giá thấp nhất từ variants
    "max_price": "350000.00",        ← Giá cao nhất từ variants
    // ... other fields
  }
}
```

### 4. **GET** `/api/v1/products` - Danh sách sản phẩm

**Response bao gồm thông tin giá trong mỗi sản phẩm:**
```json
{
  "success": true,
  "data": [
    {
      "product_id": 38,
      "product_name": "Áo Thun Premium",
      "list_price": "320000.00",
      "compare_at_price": "380000.00",
      "cost_price": "160000.00",
      "min_price": "250000.00",
      "max_price": "350000.00",
      // ... other fields
    }
  ]
}
```

---

## 🧪 Hướng dẫn test với Postman

### Test 1: Tạo sản phẩm mới với giá

1. **Method:** POST
2. **URL:** `http://localhost:8000/api/v1/products`
3. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer {your_token}`
4. **Body (raw JSON):**
```json
{
  "product_name": "Áo Polo Nam Premium",
  "category_id": 1,
  "short_description": "Áo polo nam chất liệu cao cấp",
  "description": "Áo polo nam được làm từ chất liệu cotton cao cấp, thiết kế trẻ trung, phù hợp cho cả đi làm và dạo phố",
  "material": "Cotton 95%, Spandex 5%",
  "list_price": 450000,
  "compare_at_price": 550000,
  "cost_price": 250000,
  "is_featured": true
}
```

### Test 2: Cập nhật giá sản phẩm

1. **Method:** PUT
2. **URL:** `http://localhost:8000/api/v1/products/38`
3. **Headers:**
   - `Content-Type: application/json`
   - `Authorization: Bearer {your_token}`
4. **Body (raw JSON):**
```json
{
  "list_price": 480000,
  "compare_at_price": 600000,
  "cost_price": 270000
}
```

### Test 3: Xem chi tiết sản phẩm

1. **Method:** GET
2. **URL:** `http://localhost:8000/api/v1/products/38`
3. **Headers:**
   - `Authorization: Bearer {your_token}`

---

## 💡 Lưu ý quan trọng

### Validation Rules:
- `list_price`: Số thực (numeric), không bắt buộc
- `compare_at_price`: Số thực (numeric), không bắt buộc  
- `cost_price`: Số thực (numeric), không bắt buộc, mặc định = 0

### Phân biệt các loại giá:
- **`list_price`**: Giá niêm yết chính thức của sản phẩm
- **`compare_at_price`**: Giá "gạch ngang" để hiển thị khuyến mãi
- **`cost_price`**: Giá vốn nội bộ, dùng để tính lợi nhuận
- **`min_price/max_price`**: Được tính từ các variants (biến thể) của sản phẩm

### Database Schema:
```sql
ALTER TABLE products
  ADD list_price DECIMAL(10,2) NULL COMMENT 'Giá niêm yết mặc định ở cấp sản phẩm',
  ADD compare_at_price DECIMAL(10,2) NULL COMMENT 'Giá gốc/giá so sánh để hiển thị giảm giá',
  ADD cost_price DECIMAL(10,2) NULL DEFAULT 0 COMMENT 'Giá vốn tham khảo ở cấp sản phẩm';
```

---

## 🔥 Kết quả mong đợi

✅ **Tạo sản phẩm**: API sẽ lưu được đầy đủ thông tin giá vào database  
✅ **Cập nhật giá**: Có thể cập nhật từng trường giá riêng biệt hoặc tất cả cùng lúc  
✅ **Hiển thị**: Tất cả API get sẽ trả về đầy đủ thông tin giá  
✅ **Frontend**: Có thể sử dụng các trường giá để hiển thị UI phong phú (giảm giá, so sánh giá, etc.)  

### Ví dụ UI Frontend có thể sử dụng:
```
Áo Polo Nam Premium
├── Giá bán: 450.000đ (list_price)
├── Giá gốc: 550.000đ (compare_at_price) - hiển thị gạch ngang
├── Tiết kiệm: 100.000đ (compare_at_price - list_price)
└── Variants: 250.000đ - 350.000đ (min_price - max_price)
```
