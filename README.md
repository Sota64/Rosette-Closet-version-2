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
- `POST /api/products`: tao san pham.
- `PUT /api/products/:id`: cap nhat san pham.
- `DELETE /api/products/:id`: xoa san pham.

Vi du body tao san pham:

```json
{
  "name": "Vay da hoi hong",
  "description": "Vay da hoi phong cach thanh lich",
  "rentalPrice": 300000,
  "deposit": 500000,
  "sizes": ["S", "M"],
  "color": "Hong",
  "images": ["https://example.com/dress.jpg"],
  "status": "available",
  "category": "CATEGORY_ID"
}
```

### Category

- `GET /api/categories`: lay danh sach danh muc.
- `POST /api/categories`: tao danh muc.

Vi du body tao danh muc:

```json
{
  "name": "Vay da hoi",
  "description": "Cac mau vay di tiec va su kien"
}
```

### Auth/User

- `POST /api/auth/register`: dang ky tai khoan.
- `POST /api/auth/login`: dang nhap.
- `GET /api/users`: lay danh sach nguoi dung.

Vi du body dang ky:

```json
{
  "fullName": "Nguyen Van A",
  "email": "a@example.com",
  "password": "123456",
  "phone": "0912345678",
  "address": "Ha Noi",
  "role": "customer"
}
```

Vi du body dang nhap:

```json
{
  "email": "a@example.com",
  "password": "123456"
}
```

### RentalOrder

- `POST /api/orders`: tao don thue.
- `GET /api/orders`: lay danh sach don thue.
- `GET /api/orders/:id`: lay chi tiet don thue.
- `PUT /api/orders/:id/status`: cap nhat trang thai don.

Vi du body tao don:

```json
{
  "user": "USER_ID",
  "items": [
    {
      "product": "PRODUCT_ID",
      "quantity": 1,
      "rentalPrice": 300000,
      "deposit": 500000
    }
  ],
  "startDate": "2026-06-10",
  "returnDate": "2026-06-13",
  "totalAmount": 1400000,
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
