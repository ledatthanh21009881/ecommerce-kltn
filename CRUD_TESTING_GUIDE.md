# 🧪 CATEGORIES API - CRUD TESTING GUIDE

## ✅ **Current Status from Postman Screenshot:**
- GET /api/v1/categories ✅ **WORKING** (200 OK, 46ms)
- Response shows categories data with proper structure

## 🔍 **Complete CRUD Testing Checklist:**

### 📖 **READ Operations (Public - No Auth Required):**

#### 1. ✅ Get All Categories
```
GET http://localhost:8000/api/v1/categories
Status: ✅ CONFIRMED WORKING (from screenshot)
```

#### 2. Get Hierarchical Categories
```
GET http://localhost:8000/api/v1/categories?type=hierarchy
```

#### 3. Get Main Categories Only
```
GET http://localhost:8000/api/v1/categories/main
```

#### 4. Get Category by ID
```
GET http://localhost:8000/api/v1/categories/6
(Test với PANTS category từ response)
```

#### 5. Get Category by Slug
```
GET http://localhost:8000/api/v1/categories/slug/pants
```

#### 6. Get Children Categories
```
GET http://localhost:8000/api/v1/categories/6/children
```

### ✍️ **CREATE Operation (Admin Auth Required):**

#### 7. Create New Category
```
Method: POST
URL: http://localhost:8000/api/v1/categories
Headers: 
  Authorization: Bearer <your_token>
  Content-Type: application/json
Body:
{
    "category_name": "Jeans",
    "parent_id": 6,
    "position": 1
}
```

### 🔄 **UPDATE Operation (Admin Auth Required):**

#### 8. Update Category
```
Method: PUT  
URL: http://localhost:8000/api/v1/categories/6
Headers:
  Authorization: Bearer <your_token>
  Content-Type: application/json
Body:
{
    "category_name": "PANTS & BOTTOMS",
    "position": 6
}
```

#### 9. Toggle Category Status
```
Method: PATCH
URL: http://localhost:8000/api/v1/categories/6/toggle-status
Headers: Authorization: Bearer <your_token>
```

### 🗑️ **DELETE Operation (Admin Auth Required):**

#### 10. Delete Category
```
Method: DELETE
URL: http://localhost:8000/api/v1/categories/6
Headers: Authorization: Bearer <your_token>
```

### 🔄 **REORDER Operation (Admin Auth Required):**

#### 11. Reorder Categories
```
Method: POST
URL: http://localhost:8000/api/v1/categories/reorder
Headers:
  Authorization: Bearer <your_token>
  Content-Type: application/json
Body:
{
    "categories": [
        {"category_id": 1, "position": 1},
        {"category_id": 2, "position": 2},
        {"category_id": 6, "position": 3}
    ]
}
```

## 🔐 **How to Get Auth Token:**

```
Method: POST
URL: http://localhost:8000/api/v1/auth/login
Body:
{
    "account_name": "admin",
    "password": "admin123"
}
```
Copy the `token` from response and use as Bearer token.

## 📊 **Expected Responses:**

### ✅ Success (200/201):
```json
{
    "success": true,
    "message": "Category created successfully",
    "status_code": 201,
    "data": {
        "category_id": 8,
        "category_name": "Jeans",
        "slug": "jeans",
        "parent_id": 6,
        "position": 1,
        "is_active": 1
    }
}
```

### ❌ Error (401):
```json
{
    "success": false,
    "message": "Authorization token required",
    "status_code": 401
}
```

### ❌ Validation Error (422):
```json
{
    "success": false,
    "message": "Validation failed",
    "status_code": 422,
    "errors": {
        "category_name": "Category name is required"
    }
}
```

## 🎯 **Quick Test Sequence:**

1. **Test all READ operations** (no auth needed)
2. **Login to get token** 
3. **Test CREATE** - Add a new category
4. **Test UPDATE** - Modify the new category
5. **Test TOGGLE** - Change status
6. **Test REORDER** - Change positions
7. **Test DELETE** - Remove test category

All CRUD operations are implemented and ready for testing! 🚀
