const fs = require("fs");
const path = require("path");
const multer = require("multer");

const productUploadDir = path.join(__dirname, "..", "public", "uploads", "products");

fs.mkdirSync(productUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, productUploadDir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Chi duoc upload file anh"));
  }

  return cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const uploadProductImagesHandler = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 10 }
]);

const uploadProductImages = (req, res, next) => {
  uploadProductImagesHandler(req, res, (error) => {
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.message,
        data: null
      });
    }

    return next();
  });
};

module.exports = {
  uploadProductImages
};
