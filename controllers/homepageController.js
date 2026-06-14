const Product = require("../models/Product");
const Category = require("../models/Category");
const { sendSuccess, sendError } = require("../middleware/response");

const fallbackCategoryImages = [
  "/public/images/img2.png",
  "/public/images/img3.png",
  "/public/images/img4.png",
  "/public/images/img5.png"
];

const getFirstImage = (product, fallback = "/public/images/img1.png") => {
  return product?.images?.[0] || fallback;
};

const getHomepageData = async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ createdAt: -1 })
      .limit(4)
      .lean();

    const categoryIds = categories.map((category) => category._id);

    const [featuredProducts, heroProduct, categoryStats] = await Promise.all([
      Product.find({ status: "available" })
        .populate("category", "name description")
        .sort({ createdAt: -1 })
        .limit(3)
        .lean(),
      Product.findOne({ status: "available" })
        .populate("category", "name description")
        .sort({ createdAt: -1 })
        .lean(),
      categoryIds.length
        ? Product.aggregate([
            { $match: { category: { $in: categoryIds } } },
            { $sort: { createdAt: -1 } },
            {
              $group: {
                _id: "$category",
                productCount: { $sum: 1 },
                image: { $first: { $arrayElemAt: ["$images", 0] } }
              }
            }
          ])
        : []
    ]);

    const statsByCategory = categoryStats.reduce((result, item) => {
      result[String(item._id)] = item;
      return result;
    }, {});

    const featuredCategories = categories.map((category, index) => {
      const stats = statsByCategory[String(category._id)] || {};

      return {
        _id: category._id,
        name: category.name,
        description: category.description,
        productCount: stats.productCount || 0,
        image: stats.image || fallbackCategoryImages[index] || fallbackCategoryImages[0]
      };
    });

    return sendSuccess(res, "Lay du lieu homepage thanh cong", {
      hero: {
        image: getFirstImage(heroProduct),
        product: heroProduct || null
      },
      featuredCategories,
      featuredProducts
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  getHomepageData
};
