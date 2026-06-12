# Rosette Closet

Rosette Closet la website cho thue vay duoc xay dung bang Node.js, Express va MongoDB/Mongoose theo kien truc MVC.

## Cau Truc Thu Muc

```text
config/
  db.js
controllers/
  authController.js
  categoryController.js
  productController.js
  rentalOrderController.js
  userController.js
middleware/
  response.js
models/
  User.js
  Category.js
  Product.js
  RentalOrder.js
  Payment.js
  Review.js
routes/
  authRoutes.js
  categoryRoutes.js
  productRoutes.js
  rentalOrderRoutes.js
  userRoutes.js
views/
public/
server.js
.env.example
```

## Cai Dat

1. Cai package:

```bash
npm install
```

2. Tao file `.env` tu `.env.example`:

```text
MONGO_URI=mongodb://127.0.0.1:27017/rosette_closet
PORT=5000
JWT_SECRET=thay_bang_chuoi_bi_mat_cua_ban
```

3. Chay server:

```bash
npm start
```

## Dinh Dang JSON Tra Ve

Tat ca API tra ve JSON theo mau:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

## API Co Ban

### Product

- `GET /api/products`: lay danh sach san pham.
- `GET /api/products/:id`: lay chi tiet san pham.
- `POST /api/products`: tao san pham, yeu cau admin.
- `PUT /api/products/:id`: cap nhat san pham, yeu cau admin.
- `DELETE /api/products/:id`: xoa san pham, yeu cau admin.

Query ho tro cho danh sach san pham:

```text
GET /api/products?search=vay&category=CATEGORY_ID&status=available&minPrice=1000000&maxPrice=5000000&page=1&limit=10
```

Them/sua san pham gui dang `multipart/form-data`. Anh upload tu may dung field `image`, server luu vao `public/uploads/products` va DB luu duong dan trong `images`.

Vi du fields tao san pham:

```text
name=Vay da hoi hong
description=Vay da hoi phong cach thanh lich
rentalPrice=300000
deposit=500000
sizes=S
sizes=M
color=Hong
status=available
category=CATEGORY_ID hoac ten danh muc
image=<file anh tu may>
```

### Category

- `GET /api/categories`: lay danh sach danh muc.
- `POST /api/categories`: tao danh muc, yeu cau admin.

Vi du body tao danh muc:

```json
{
  "name": "Vay da hoi",
  "description": "Cac mau vay di tiec va su kien"
}
```

### Auth/User

- `POST /api/auth/register`: dang ky tai khoan, tao `accessToken` va `refreshToken` trong cookie.
- `POST /api/auth/login`: dang nhap, tao `accessToken` va `refreshToken` trong cookie.
- `POST /api/auth/refresh`: dung `refreshToken` cookie de tao lai `accessToken` cookie.
- `GET /api/auth/me`: lay user dang dang nhap tu cookie token.
- `POST /api/auth/logout`: xoa token cookies.
- `GET /api/users`: lay danh sach nguoi dung, yeu cau admin.
- `POST /api/users`: tao nguoi dung, yeu cau admin.
- `GET /api/users/:id`: lay chi tiet nguoi dung, yeu cau admin.
- `PUT /api/users/:id`: cap nhat nguoi dung, yeu cau admin.
- `DELETE /api/users/:id`: xoa nguoi dung, yeu cau admin.

Query ho tro cho danh sach nguoi dung:

```text
GET /api/users?search=nguyen&role=customer&isActive=true&page=1&limit=10
```

Response danh sach nguoi dung co dang:

```json
{
  "users": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  },
  "stats": {
    "total": 0,
    "customer": 0,
    "admin": 0,
    "active": 0,
    "inactive": 0
  }
}
```

Vi du body dang ky:

```json
{
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "password": "123456",
  "phone": "0912345678",
  "address": "Ha Noi"
}
```

Vi du body dang nhap:

```json
{
  "email": "a@example.com",
  "password": "123456"
}
```

Khi goi API bang `fetch`, gui cookie token kem request:

```js
fetch("/api/orders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  credentials: "include",
  body: JSON.stringify(orderData)
});
```

### RentalOrder

- `POST /api/orders`: tao don thue.
- `GET /api/orders`: lay danh sach don thue, yeu cau admin.
- `GET /api/orders/my`: lay danh sach don thue cua user dang dang nhap.
- `GET /api/orders/:id`: lay chi tiet don thue, admin hoac chu don.
- `PUT /api/orders/:id`: cap nhat don thue, yeu cau admin.
- `PUT /api/orders/:id/status`: cap nhat trang thai don, yeu cau admin.
- `DELETE /api/orders/:id`: xoa don thue, yeu cau admin.

Query ho tro cho danh sach don thue:

```text
GET /api/orders?status=pending&user=USER_ID&fromDate=2026-06-01&toDate=2026-06-30&page=1&limit=10
```

Response danh sach don thue co dang:

```json
{
  "orders": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "totalPages": 0
  },
  "stats": {
    "total": 0,
    "pending": 0,
    "approved": 0,
    "delivering": 0,
    "renting": 0,
    "returned": 0,
    "completed": 0,
    "cancelled": 0,
    "revenue": 0,
    "todayNew": 0
  }
}
```

Vi du body tao don:

```json
{
  "user": "USER_ID",
  "items": [
    {
      "product": "PRODUCT_ID",
      "quantity": 1
    }
  ],
  "startDate": "2026-06-10",
  "returnDate": "2026-06-13",
  "status": "pending"
}
```

Vi du body cap nhat trang thai don:

```json
{
  "status": "approved"
}
```

## Cach Test Bang Postman Hoac Thunder Client

1. Chay server bang `npm start`.
2. Tao request moi voi base URL: `http://localhost:5000`.
3. Chon dung method: `GET`, `POST`, `PUT`, hoac `DELETE`.
4. Voi request co body, vao tab `Body` -> chon `raw` -> chon `JSON`.
5. Gui request theo thu tu de co du ID lien ket:
   - Tao user: `POST /api/auth/register`
   - Tao category: `POST /api/categories`
   - Tao product voi `category` la ID vua tao: `POST /api/products`
   - Tao order voi `user` va `product` la ID vua tao: `POST /api/orders`
