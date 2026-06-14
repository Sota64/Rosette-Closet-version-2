const Product = require("../models/Product");
const RentalOrder = require("../models/RentalOrder");
const User = require("../models/User");
const { sendSuccess, sendError } = require("../middleware/response");

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getStartOfDay = (date = new Date()) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
};

const getPercentChange = (current, previous) => {
  if (previous > 0) {
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  return current > 0 ? 100 : 0;
};

const buildRevenueSeries = async (startDate) => {
  const rows = await RentalOrder.aggregate([
    {
      $match: {
        status: { $ne: "cancelled" },
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          $dateToString: {
            date: "$createdAt",
            format: "%Y-%m-%d",
            timezone: "Asia/Ho_Chi_Minh"
          }
        },
        revenue: { $sum: "$totalAmount" }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  const revenueByDate = rows.reduce((result, row) => {
    result[row._id] = row.revenue;
    return result;
  }, {});

  return Array.from({ length: 30 }, (_, index) => {
    const date = new Date(startDate.getTime() + index * MS_PER_DAY);
    const key = date.toISOString().slice(0, 10);

    return {
      date: key,
      revenue: revenueByDate[key] || 0
    };
  });
};

const getTopProductInsight = async () => {
  const [topProduct] = await RentalOrder.aggregate([
    { $match: { status: { $ne: "cancelled" } } },
    { $unwind: "$items" },
    {
      $group: {
        _id: "$items.product",
        rentedQuantity: { $sum: "$items.quantity" }
      }
    },
    { $sort: { rentedQuantity: -1 } },
    { $limit: 1 },
    {
      $lookup: {
        from: "products",
        localField: "_id",
        foreignField: "_id",
        as: "product"
      }
    },
    { $unwind: "$product" },
    {
      $project: {
        _id: 0,
        productName: "$product.name",
        rentedQuantity: 1
      }
    }
  ]);

  if (!topProduct) {
    return "Chua co du lieu don thue. Hay tao don hang dau tien de dashboard bat dau phan tich xu huong.";
  }

  return `${topProduct.productName} dang la san pham duoc thue nhieu nhat voi ${topProduct.rentedQuantity} luot thue.`;
};

const getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const todayStart = getStartOfDay(now);
    const tomorrowStart = new Date(todayStart.getTime() + MS_PER_DAY);
    const currentPeriodStart = new Date(now.getTime() - 30 * MS_PER_DAY);
    const previousPeriodStart = new Date(now.getTime() - 60 * MS_PER_DAY);

    const [
      totalRevenueResult,
      currentRevenueResult,
      previousRevenueResult,
      activeRentals,
      dueToday,
      totalUsers,
      newUsers,
      totalProducts,
      availableProducts,
      maintenanceProducts,
      recentOrders,
      revenueSeries,
      insight
    ] = await Promise.all([
      RentalOrder.aggregate([
        { $match: { status: { $ne: "cancelled" } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]),
      RentalOrder.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            createdAt: { $gte: currentPeriodStart }
          }
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]),
      RentalOrder.aggregate([
        {
          $match: {
            status: { $ne: "cancelled" },
            createdAt: { $gte: previousPeriodStart, $lt: currentPeriodStart }
          }
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } }
      ]),
      RentalOrder.countDocuments({ status: { $in: ["delivering", "renting"] } }),
      RentalOrder.countDocuments({
        status: { $in: ["delivering", "renting"] },
        returnDate: { $gte: todayStart, $lt: tomorrowStart }
      }),
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: currentPeriodStart } }),
      Product.countDocuments(),
      Product.countDocuments({ status: "available" }),
      Product.countDocuments({ status: { $in: ["maintenance", "outofstock"] } }),
      RentalOrder.find()
        .sort("-createdAt")
        .limit(4)
        .populate("user", "fullName phone")
        .populate("items.product", "name code"),
      buildRevenueSeries(currentPeriodStart),
      getTopProductInsight()
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;
    const currentRevenue = currentRevenueResult[0]?.total || 0;
    const previousRevenue = previousRevenueResult[0]?.total || 0;
    const revenueGrowthPercent = getPercentChange(currentRevenue, previousRevenue);
    const inventoryHealthPercent = totalProducts > 0
      ? Number(((availableProducts / totalProducts) * 100).toFixed(1))
      : 0;
    const activeRentalPercent = totalProducts > 0
      ? Number(((activeRentals / totalProducts) * 100).toFixed(1))
      : 0;

    return sendSuccess(res, "Lay thong tin dashboard thanh cong", {
      admin: {
        fullName: req.user.fullName,
        role: req.user.role
      },
      kpis: {
        totalRevenue,
        revenueGrowthPercent,
        activeRentals,
        activeRentalPercent,
        dueToday,
        totalUsers,
        newUsers,
        inventoryHealthPercent,
        maintenanceProducts
      },
      recentOrders,
      revenueSeries,
      insight
    });
  } catch (error) {
    return sendError(res, error.message);
  }
};

module.exports = {
  getDashboard
};
