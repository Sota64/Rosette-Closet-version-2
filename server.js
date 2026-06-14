const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const rentalOrderRoutes = require("./routes/rentalOrderRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const homepageRoutes = require("./routes/homepageRoutes");
const cookieParser = require("./middleware/cookieParser");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser);

app.use("/public", express.static(path.join(__dirname, "public")));
app.use("/views", express.static(path.join(__dirname, "views")));

// app.get("/", (req, res) => {
//   res.send("Rosette Closet API is running");
// });

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", rentalOrderRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/homepage", homepageRoutes);

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "user", "homepage.html"));
});

app.get("/views/admin/dashboard.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin", "dashboard.html"));
});

app.get("/views/admin/products.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin", "products.html"));
});

app.get("/views/admin/orders.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin", "orders.html"));
});

app.get("/views/admin/users.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin", "users.html"));
});

app.get("/views/admin/reports.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "admin", "reports.html"));
});

app.get("/views/layouts/sidebar.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "layouts", "sidebar.html"));
});

app.get("/views/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.get("/views/signUp.html", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "signUp.html"));
});


const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

startServer();
