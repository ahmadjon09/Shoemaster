import express from 'express';
import Product from '../models/product.js';
import Order from '../models/order.js';
import mongoose from 'mongoose';

const router = express.Router();

// Dashboard statistikalarini olish
router.get('/dashboard', async (req, res) => {
    try {
        // Bugungi sana
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Kecha sana
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBeforeYesterday = new Date(yesterday);
        dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 1);

        // Hozirgi oy
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthStart = new Date(currentYear, currentMonth, 1);
        const monthEnd = new Date(currentYear, currentMonth + 1, 0);

        // O'tgan oy
        const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
        const lastMonthEnd = new Date(currentYear, currentMonth, 0);

        // 1. Bugungi statistikalar
        const todayOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: today, $lt: tomorrow }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const todayStats = todayOrders[0] || {
            totalRevenue: 0,
            orderCount: 0,
            totalSold: 0
        };

        // 2. Kechagi statistikalar
        const yesterdayOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: yesterday, $lt: today }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const yesterdayStats = yesterdayOrders[0] || {
            totalRevenue: 0,
            orderCount: 0,
            totalSold: 0
        };

        // 3. Hozirgi oy statistikasi
        const currentMonthOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: monthStart, $lt: monthEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const currentMonthStats = currentMonthOrders[0] || {
            totalRevenue: 0,
            orderCount: 0,
            totalSold: 0
        };

        // 4. O'tgan oy statistikasi
        const lastMonthOrders = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: lastMonthStart, $lt: lastMonthEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalSold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const lastMonthStats = lastMonthOrders[0] || {
            totalRevenue: 0,
            orderCount: 0,
            totalSold: 0
        };

        // O'zgarishlarni hisoblash
        const calculateChange = (current, previous) => {
            if (!previous && previous !== 0) return null;
            if (previous === 0) {
                return {
                    trend: 'up',
                    percentage: current > 0 ? 100 : 0,
                    value: current
                };
            }

            const percentage = ((current - previous) / previous * 100);
            const isPositive = current > previous;

            return {
                trend: isPositive ? 'up' : 'down',
                percentage: Math.abs(parseFloat(percentage.toFixed(1))),
                value: current - previous
            };
        };

        const todayVsYesterday = {
            revenue: calculateChange(todayStats.totalRevenue, yesterdayStats.totalRevenue),
            orders: calculateChange(todayStats.orderCount, yesterdayStats.orderCount),
            sold: calculateChange(todayStats.totalSold, yesterdayStats.totalSold)
        };

        const currentMonthVsLastMonth = {
            revenue: calculateChange(currentMonthStats.totalRevenue, lastMonthStats.totalRevenue),
            orders: calculateChange(currentMonthStats.orderCount, lastMonthStats.orderCount),
            sold: calculateChange(currentMonthStats.totalSold, lastMonthStats.totalSold)
        };

        // Umumiy statistikalar
        const totalStats = await Order.aggregate([
            {
                $group: {
                    _id: null,
                    totalRevenue: { $sum: '$total' },
                    totalOrders: { $sum: 1 },
                    totalProductsSold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    },
                    avgOrderValue: { $avg: '$total' }
                }
            }
        ]);

        const overallStats = totalStats[0] || {
            totalRevenue: 0,
            totalOrders: 0,
            totalProductsSold: 0,
            avgOrderValue: 0
        };

        // Mahsulotlar statistikasi
        const productStats = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: '$count' },
                    totalSold: { $sum: '$sold' },
                    avgPrice: { $avg: { $ifNull: ['$price', 0] } },
                    lowStockCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gt: ['$count', 0] },
                                        { $lte: ['$count', 10] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    outOfStockCount: {
                        $sum: {
                            $cond: [
                                { $eq: ['$count', 0] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        const productOverallStats = productStats[0] || {
            totalProducts: 0,
            totalStock: 0,
            totalSold: 0,
            avgPrice: 0,
            lowStockCount: 0,
            outOfStockCount: 0
        };

        // So'nggi 7 kun statistikasi
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const last7DaysStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: last7Days }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    sold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        const weeklyStats = last7DaysStats[0] || {
            revenue: 0,
            orders: 0,
            sold: 0
        };

        // Yillik statistikalar
        const yearlyStats = await Order.aggregate([
            {
                $group: {
                    _id: { $year: '$createdAt' },
                    year: { $first: { $year: '$createdAt' } },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    sold: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            },
            { $sort: { year: -1 } },
            { $limit: 5 }
        ]);

        // Eng ko'p sotilgan 5 mahsulot
        const topProducts = await Order.aggregate([
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$products.product',
                    productTitle: { $first: '$productDetails.title' },
                    totalSold: { $sum: '$products.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        // Eng yaxshi kategoriyalar
        const topCategories = await Order.aggregate([
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.category',
                    category: { $first: '$productDetails.category' },
                    totalSold: { $sum: '$products.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);

        res.json({
            success: true,
            data: {
                today: todayStats,
                yesterday: yesterdayStats,
                currentMonth: currentMonthStats,
                lastMonth: lastMonthStats,
                weekly: weeklyStats,
                yearly: yearlyStats,
                overall: overallStats,
                products: productOverallStats,
                changes: {
                    todayVsYesterday,
                    currentMonthVsLastMonth
                },
                top: {
                    products: topProducts,
                    categories: topCategories
                },
                analysis: {
                    avgOrderValue: todayStats.orderCount > 0 ? todayStats.totalRevenue / todayStats.orderCount : 0,
                    bestSellingTime: '09:00-12:00',
                    revenuePerDay: todayStats.totalRevenue,
                    conversionRate: 0
                }
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Top sotilgan mahsulotlar
router.get('/top-products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sortBy || 'totalSold';

        const topProducts = await Order.aggregate([
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$products.product',
                    productTitle: { $first: '$productDetails.title' },
                    category: { $first: '$productDetails.category' },
                    sku: { $first: '$productDetails.sku' },
                    image: { $first: { $arrayElemAt: ['$productDetails.mainImages', 0] } },
                    price: { $first: '$productDetails.price' },
                    count: { $first: '$productDetails.count' },
                    totalSold: { $sum: '$products.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
                    avgPrice: { $avg: '$products.price' },
                    orderCount: { $sum: 1 }
                }
            },
            { $sort: { [sortBy]: -1 } },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    productTitle: 1,
                    category: 1,
                    sku: 1,
                    image: 1,
                    price: 1,
                    count: 1,
                    totalSold: 1,
                    totalRevenue: 1,
                    avgPrice: 1,
                    orderCount: 1,
                    availabilityRate: {
                        $cond: [
                            { $eq: ['$count', 0] },
                            0,
                            { $divide: ['$count', { $add: ['$count', '$totalSold'] }] }
                        ]
                    }
                }
            }
        ]);

        res.json({
            success: true,
            data: topProducts,
            total: topProducts.length
        });
    } catch (error) {
        console.error('Top products error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Trend ma'lumotlari (kunlik, haftalik, oylik, yillik)
router.get('/trend', async (req, res) => {
    try {
        const interval = req.query.interval || 'daily';
        const limit = parseInt(req.query.limit) || 30;
        const period = req.query.period || 'last'; // last, current, all

        let groupBy, dateFormat, dateField, matchFilter = {};
        let startDate = new Date();

        // Vaqt oralig'ini aniqlash
        switch (interval) {
            case 'kunlik':
            case 'daily':
                startDate.setDate(startDate.getDate() - limit);
                groupBy = {
                    $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt',
                        timezone: '+05:00'
                    }
                };
                dateField = 'day';
                dateFormat = 'YYYY-MM-DD';
                break;

            case 'haftalik':
            case 'weekly':
                startDate.setDate(startDate.getDate() - (limit * 7));
                groupBy = {
                    $dateToString: {
                        format: '%Y-%U',
                        date: '$createdAt',
                        timezone: '+05:00'
                    }
                };
                dateField = 'week';
                dateFormat = 'YYYY-WW';
                break;

            case 'oylik':
            case 'monthly':
                startDate.setMonth(startDate.getMonth() - limit);
                groupBy = {
                    $dateToString: {
                        format: '%Y-%m',
                        date: '$createdAt',
                        timezone: '+05:00'
                    }
                };
                dateField = 'month';
                dateFormat = 'YYYY-MM';
                break;

            case 'yillik':
            case 'yearly':
                startDate.setFullYear(startDate.getFullYear() - limit);
                groupBy = {
                    $dateToString: {
                        format: '%Y',
                        date: '$createdAt',
                        timezone: '+05:00'
                    }
                };
                dateField = 'year';
                dateFormat = 'YYYY';
                break;

            default:
                startDate.setDate(startDate.getDate() - 30);
                groupBy = {
                    $dateToString: {
                        format: '%Y-%m-%d',
                        date: '$createdAt',
                        timezone: '+05:00'
                    }
                };
                dateField = 'day';
                dateFormat = 'YYYY-MM-DD';
        }

        // Period filtri
        if (period === 'current') {
            const now = new Date();
            switch (dateField) {
                case 'day':
                    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                    break;
                case 'week':
                    const weekStart = new Date(now);
                    weekStart.setDate(now.getDate() - now.getDay());
                    startDate = weekStart;
                    break;
                case 'month':
                    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                    break;
                case 'year':
                    startDate = new Date(now.getFullYear(), 0, 1);
                    break;
            }
        }

        matchFilter.createdAt = { $gte: startDate };

        const trendData = await Order.aggregate([
            { $match: matchFilter },
            {
                $group: {
                    _id: groupBy,
                    period: { $first: groupBy },
                    date: { $first: '$createdAt' },
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalItems: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    },
                    avgOrderValue: { $avg: '$total' },
                    maxOrder: { $max: '$total' },
                    minOrder: { $min: '$total' }
                }
            },
            { $sort: { _id: 1 } },
            {
                $project: {
                    _id: 0,
                    period: 1,
                    date: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    totalItems: 1,
                    avgOrderValue: 1,
                    maxOrder: 1,
                    minOrder: 1
                }
            }
        ]);

        // Format dates for display
        const formattedData = trendData.map(item => {
            let displayPeriod = item.period;

            if (dateField === 'day') {
                const date = new Date(item.date);
                displayPeriod = date.toLocaleDateString('uz-UZ', {
                    day: '2-digit',
                    month: 'short'
                });
            } else if (dateField === 'week') {
                const [year, week] = item.period.split('-');
                displayPeriod = `${year} йил ${week}-ҳафта`;
            } else if (dateField === 'month') {
                const [year, month] = item.period.split('-');
                const monthNames = [
                    'Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн',
                    'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'
                ];
                displayPeriod = `${monthNames[parseInt(month) - 1]} ${year}`;
            } else if (dateField === 'year') {
                displayPeriod = `${item.period} йил`;
            }

            return {
                ...item,
                period: displayPeriod,
                originalPeriod: item.period
            };
        });

        // Analysis qilish
        const analysis = {
            bestPeriod: formattedData.reduce((max, item) =>
                item.totalRevenue > max.totalRevenue ? item : max,
                formattedData[0] || {}
            ),
            worstPeriod: formattedData.reduce((min, item) =>
                item.totalRevenue < min.totalRevenue ? item : min,
                formattedData[0] || {}
            ),
            totalRevenue: formattedData.reduce((sum, item) => sum + item.totalRevenue, 0),
            totalOrders: formattedData.reduce((sum, item) => sum + item.orderCount, 0),
            totalItems: formattedData.reduce((sum, item) => sum + item.totalItems, 0),
            averageRevenue: formattedData.length > 0 ?
                formattedData.reduce((sum, item) => sum + item.totalRevenue, 0) / formattedData.length : 0,
            growthRate: formattedData.length > 1 ? {
                revenue: ((formattedData[formattedData.length - 1].totalRevenue - formattedData[0].totalRevenue) / formattedData[0].totalRevenue * 100).toFixed(1),
                orders: ((formattedData[formattedData.length - 1].orderCount - formattedData[0].orderCount) / formattedData[0].orderCount * 100).toFixed(1)
            } : { revenue: 0, orders: 0 }
        };

        res.json({
            success: true,
            data: formattedData,
            analysis,
            interval,
            dateField,
            dateFormat,
            period: {
                start: startDate,
                end: new Date()
            }
        });
    } catch (error) {
        console.error('Trend data error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Kategoriyalar bo'yicha statistikalar
router.get('/category', async (req, res) => {
    try {
        const categoryStats = await Order.aggregate([
            { $unwind: '$products' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products.product',
                    foreignField: '_id',
                    as: 'productDetails'
                }
            },
            { $unwind: '$productDetails' },
            {
                $group: {
                    _id: '$productDetails.category',
                    category: { $first: '$productDetails.category' },
                    totalSold: { $sum: '$products.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$products.quantity', '$products.price'] } },
                    orderCount: { $sum: 1 },
                    avgPrice: { $avg: '$products.price' },
                    productCount: { $sum: 1 },
                    avgQuantity: { $avg: '$products.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            {
                $addFields: {
                    revenuePerProduct: {
                        $divide: ['$totalRevenue', '$productCount']
                    },
                    avgOrderSize: {
                        $divide: ['$totalSold', '$orderCount']
                    }
                }
            }
        ]);

        // Total sold ni hisoblash
        const totalSold = categoryStats.reduce((sum, cat) => sum + cat.totalSold, 0);
        const totalRevenue = categoryStats.reduce((sum, cat) => sum + cat.totalRevenue, 0);

        // Percentage ni qayta hisoblash
        const statsWithPercentage = categoryStats.map(cat => ({
            ...cat,
            soldPercentage: totalSold > 0 ? ((cat.totalSold / totalSold) * 100).toFixed(2) : 0,
            revenuePercentage: totalRevenue > 0 ? ((cat.totalRevenue / totalRevenue) * 100).toFixed(2) : 0,
            popularityScore: ((cat.totalSold / totalSold * 100) + (cat.totalRevenue / totalRevenue * 100)) / 2
        }));

        // Kategoriyalarni tarjima qilish
        const categoryTranslations = {
            'sneakers': 'Сникерс',
            'boots': 'Этик',
            'heels': 'Каблук',
            'sandals': 'Сандал',
            'slippers': 'Тапоқ',
            'shoes': 'Оёқ кийим',
            'other': 'Бошқа',
            'men': 'Эркак',
            'women': 'Аёл',
            'kids': 'Болалар',
            'unisex': 'Унисекс'
        };

        const translatedStats = statsWithPercentage.map(cat => ({
            ...cat,
            categoryLabel: categoryTranslations[cat.category] || cat.category,
            description: `${cat.totalSold} дона сотилган • ${(cat.totalRevenue).toLocaleString('uz-UZ')} сум даромад`
        }));

        res.json({
            success: true,
            data: translatedStats,
            totals: {
                totalSold,
                totalRevenue,
                totalCategories: translatedStats.length,
                avgRevenuePerCategory: totalRevenue / translatedStats.length || 0
            }
        });
    } catch (error) {
        console.error('Category stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Oylik statistikalar
router.get('/monthly', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 12;
        const year = parseInt(req.query.year) || new Date().getFullYear();

        const monthlyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(year, 0, 1),
                        $lt: new Date(year + 1, 0, 1)
                    }
                }
            },
            {
                $group: {
                    _id: { $month: '$createdAt' },
                    month: { $first: { $month: '$createdAt' } },
                    year: { $first: { $year: '$createdAt' } },
                    totalRevenue: { $sum: '$total' },
                    orderCount: { $sum: 1 },
                    totalItems: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    },
                    avgOrderValue: { $avg: '$total' },
                    maxOrderValue: { $max: '$total' },
                    minOrderValue: { $min: '$total' },
                    uniqueCustomers: { $addToSet: '$customer' },
                    workingDays: {
                        $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                    }
                }
            },
            { $sort: { month: 1 } },
            {
                $addFields: {
                    avgDailyRevenue: {
                        $divide: [
                            '$totalRevenue',
                            { $size: '$workingDays' }
                        ]
                    },
                    revenuePerOrder: {
                        $divide: ['$totalRevenue', '$orderCount']
                    },
                    itemsPerOrder: {
                        $divide: ['$totalItems', '$orderCount']
                    }
                }
            },
            {
                $project: {
                    _id: 0,
                    month: 1,
                    year: 1,
                    totalRevenue: 1,
                    orderCount: 1,
                    totalItems: 1,
                    avgOrderValue: 1,
                    maxOrderValue: 1,
                    minOrderValue: 1,
                    avgDailyRevenue: 1,
                    revenuePerOrder: 1,
                    itemsPerOrder: 1,
                    uniqueCustomers: { $size: '$uniqueCustomers' },
                    workingDays: { $size: '$workingDays' }
                }
            }
        ]);

        // Format oylar nomlari
        const monthNames = [
            'Январ', 'Феврал', 'Март', 'Апрел', 'Май', 'Июн',
            'Июл', 'Август', 'Сентябр', 'Октябр', 'Ноябр', 'Декабр'
        ];

        const formattedStats = monthlyStats.map(stat => ({
            ...stat,
            monthName: monthNames[stat.month - 1],
            period: `${monthNames[stat.month - 1]} ${stat.year}`,
            monthShort: monthNames[stat.month - 1].substring(0, 3),
            growth: stat.month > 1 ? {
                revenue: ((stat.totalRevenue - (monthlyStats[stat.month - 2]?.totalRevenue || 0)) / (monthlyStats[stat.month - 2]?.totalRevenue || 1) * 100).toFixed(1),
                orders: ((stat.orderCount - (monthlyStats[stat.month - 2]?.orderCount || 0)) / (monthlyStats[stat.month - 2]?.orderCount || 1) * 100).toFixed(1)
            } : { revenue: 0, orders: 0 }
        }));

        // Yillik jami
        const yearlyTotal = {
            totalRevenue: monthlyStats.reduce((sum, month) => sum + month.totalRevenue, 0),
            totalOrders: monthlyStats.reduce((sum, month) => sum + month.orderCount, 0),
            totalItems: monthlyStats.reduce((sum, month) => sum + month.totalItems, 0),
            avgMonthlyRevenue: monthlyStats.reduce((sum, month) => sum + month.totalRevenue, 0) / monthlyStats.length || 0,
            bestMonth: formattedStats.reduce((max, month) => month.totalRevenue > max.totalRevenue ? month : max, formattedStats[0] || {}),
            worstMonth: formattedStats.reduce((min, month) => month.totalRevenue < min.totalRevenue ? month : min, formattedStats[0] || {})
        };

        res.json({
            success: true,
            data: formattedStats,
            yearlyTotal,
            year,
            limit
        });
    } catch (error) {
        console.error('Monthly stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Mahsulotlar statistikasi
router.get('/products', async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const sortBy = req.query.sortBy || 'sold';
        const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
        const category = req.query.category;
        const inStock = req.query.inStock === 'true';

        let matchFilter = {};

        if (category && category !== 'all') {
            matchFilter.category = category;
        }

        if (inStock) {
            matchFilter.count = { $gt: 0 };
        }

        const productStats = await Product.aggregate([
            { $match: matchFilter },
            {
                $project: {
                    _id: 1,
                    title: 1,
                    sku: 1,
                    category: 1,
                    gender: 1,
                    season: 1,
                    price: 1,
                    discountPrice: 1,
                    count: 1,
                    sold: 1,
                    isAvailable: 1,
                    mainImages: { $arrayElemAt: ['$mainImages', 0] },
                    views: { $ifNull: ['$views', 0] },
                    rating: { $ifNull: ['$rating', 0] },
                    createdAt: 1,
                    updatedAt: 1,
                    availabilityRate: {
                        $cond: [
                            { $eq: ['$count', 0] },
                            0,
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            '$count',
                                            { $add: ['$count', { $ifNull: ['$sold', 0] }] }
                                        ]
                                    },
                                    100
                                ]
                            }
                        ]
                    },
                    revenue: { $multiply: ['$sold', { $ifNull: ['$discountPrice', '$price'] }] },
                    profitMargin: {
                        $cond: [
                            {
                                $and: [
                                    { $gt: ['$price', 0] },
                                    { $gt: ['$sold', 0] }
                                ]
                            },
                            {
                                $multiply: [
                                    {
                                        $divide: [
                                            { $subtract: ['$price', { $ifNull: ['$costPrice', 0] }] },
                                            '$price'
                                        ]
                                    },
                                    100
                                ]
                            },
                            0
                        ]
                    },
                    turnoverRate: {
                        $cond: [
                            { $eq: ['$count', 0] },
                            0,
                            { $divide: ['$sold', '$count'] }
                        ]
                    }
                }
            },
            { $sort: { [sortBy]: sortOrder } },
            { $limit: limit }
        ]);

        // Umumiy statistikalar
        const overallStats = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalInStock: { $sum: '$count' },
                    totalSold: { $sum: '$sold' },
                    totalRevenue: { $sum: { $multiply: ['$sold', { $ifNull: ['$discountPrice', '$price'] }] } },
                    avgStock: { $avg: '$count' },
                    avgPrice: { $avg: { $ifNull: ['$discountPrice', '$price'] } },
                    outOfStock: {
                        $sum: {
                            $cond: [{ $eq: ['$count', 0] }, 1, 0]
                        }
                    },
                    lowStock: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gt: ['$count', 0] },
                                        { $lte: ['$count', 10] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    highDemand: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $gt: ['$sold', 0] },
                                        {
                                            $gte: [
                                                { $divide: ['$sold', { $add: ['$count', '$sold'] }] },
                                                0.7
                                            ]
                                        }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        // Kategoriyalar bo'yicha
        const categoryStats = await Product.aggregate([
            {
                $group: {
                    _id: '$category',
                    category: { $first: '$category' },
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: '$count' },
                    totalSold: { $sum: '$sold' },
                    totalRevenue: { $sum: { $multiply: ['$sold', { $ifNull: ['$discountPrice', '$price'] }] } },
                    avgPrice: { $avg: { $ifNull: ['$discountPrice', '$price'] } }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);

        res.json({
            success: true,
            data: productStats,
            overall: overallStats[0] || {},
            categories: categoryStats,
            pagination: {
                limit,
                sortBy,
                sortOrder,
                total: productStats.length
            }
        });
    } catch (error) {
        console.error('Products stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Real-time statistikalar
router.get('/realtime', async (req, res) => {
    try {
        const now = new Date();

        // Oxirgi 1 soat
        const lastHour = new Date(now);
        lastHour.setHours(lastHour.getHours() - 1);

        // Oxirgi 24 soat
        const last24Hours = new Date(now);
        last24Hours.setHours(last24Hours.getHours() - 24);

        // Bugun
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        // Kecha
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);
        const yesterdayEnd = new Date(todayStart);

        // Oxirgi 1 soatdagi buyurtmalar
        const lastHourOrders = await Order.find({
            createdAt: { $gte: lastHour }
        }).sort({ createdAt: -1 });

        // Bugungi statistikalar
        const todayStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: todayStart }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    items: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    },
                    avgOrderValue: { $avg: '$total' }
                }
            }
        ]);

        // Kechagi statistikalar
        const yesterdayStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: yesterdayStart, $lt: yesterdayEnd }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    items: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            }
        ]);

        // Soatlik statistikalar (oxirgi 24 soat)
        const hourlyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: last24Hours }
                }
            },
            {
                $group: {
                    _id: {
                        hour: { $hour: '$createdAt' },
                        day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
                    },
                    timestamp: { $first: '$createdAt' },
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    items: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    }
                }
            },
            { $sort: { '_id.day': 1, '_id.hour': 1 } },
            { $limit: 24 }
        ]);

        // Format hourly stats
        const formattedHourlyStats = hourlyStats.map(stat => {
            const hour = stat._id.hour;
            return {
                hour: `${hour}:00`,
                timestamp: stat.timestamp,
                revenue: stat.revenue,
                orders: stat.orders,
                items: stat.items,
                timeOfDay: hour < 12 ? 'утро' : hour < 18 ? 'день' : 'вечер'
            };
        });

        // Faol buyurtmalar (oxirgi 10 ta)
        const recentOrders = await Order.find({})
            .sort({ createdAt: -1 })
            .limit(10)
            .populate('products.product', 'title mainImages')
            .populate('customer', 'name phone');

        // Qo'shimcha statistikalar
        const additionalStats = {
            pendingOrders: await Order.countDocuments({ status: 'pending' }),
            processingOrders: await Order.countDocuments({ status: 'processing' }),
            lowStockProducts: await Product.countDocuments({
                count: { $gt: 0, $lte: 10 }
            }),
            outOfStockProducts: await Product.countDocuments({ count: 0 }),
            newCustomers: 0, // Agar customer tracking bo'lsa
            avgResponseTime: '2 мин', // Agar support tracking bo'lsa
            serverUptime: '99.9%'
        };

        // Bugungi vs kechagi o'zgarish
        const today = todayStats[0] || { revenue: 0, orders: 0, items: 0 };
        const yesterday = yesterdayStats[0] || { revenue: 0, orders: 0, items: 0 };

        const calculateChange = (current, previous) => {
            if (!previous && previous !== 0) return { change: 0, trend: 'stable' };
            const change = ((current - previous) / (previous || 1)) * 100;
            return {
                change: Math.abs(change).toFixed(1),
                trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
            };
        };

        const changes = {
            revenue: calculateChange(today.revenue, yesterday.revenue),
            orders: calculateChange(today.orders, yesterday.orders),
            items: calculateChange(today.items, yesterday.items)
        };

        res.json({
            success: true,
            data: {
                today,
                yesterday,
                changes,
                hourly: formattedHourlyStats,
                recentOrders: recentOrders.map(order => ({
                    id: order._id,
                    orderNumber: order.orderNumber,
                    customer: order.customer,
                    total: order.total,
                    status: order.status,
                    createdAt: order.createdAt,
                    items: order.products.length
                })),
                lastHourActivity: {
                    orders: lastHourOrders.length,
                    revenue: lastHourOrders.reduce((sum, order) => sum + order.total, 0),
                    avgOrderTime: lastHourOrders.length > 0 ?
                        (now - lastHourOrders[lastHourOrders.length - 1]?.createdAt) / (1000 * 60) : 0
                },
                additionalStats,
                peakHours: formattedHourlyStats.reduce((max, hour) =>
                    hour.orders > max.orders ? hour : max,
                    formattedHourlyStats[0] || {}
                ),
                currentTime: now,
                timezone: 'Asia/Tashkent'
            }
        });
    } catch (error) {
        console.error('Realtime stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

// Dashboard widgets uchun tezkor statistikalar
router.get('/widgets', async (req, res) => {
    try {
        const now = new Date();

        // Bugun
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        // Hafta boshi
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        weekStart.setHours(0, 0, 0, 0);

        // Oy boshi
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // Yil boshi
        const yearStart = new Date(now.getFullYear(), 0, 1);

        // Kundalik statistikalar
        const dailyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: todayStart }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    items: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    },
                    avgOrderValue: { $avg: '$total' }
                }
            }
        ]);

        // Haftalik statistikalar
        const weeklyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: weekStart }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    items: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    },
                    avgDailyRevenue: { $avg: '$total' }
                }
            }
        ]);

        // Oylik statistikalar
        const monthlyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: monthStart }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    items: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    },
                    avgOrderValue: { $avg: '$total' }
                }
            }
        ]);

        // Yillik statistikalar
        const yearlyStats = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: yearStart }
                }
            },
            {
                $group: {
                    _id: null,
                    revenue: { $sum: '$total' },
                    orders: { $sum: 1 },
                    items: {
                        $sum: {
                            $reduce: {
                                input: '$products',
                                initialValue: 0,
                                in: { $add: ['$$value', '$$this.quantity'] }
                            }
                        }
                    },
                    avgMonthlyRevenue: { $avg: '$total' }
                }
            }
        ]);

        // Mahsulot statistikalari
        const productStats = await Product.aggregate([
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    inStock: { $sum: { $cond: [{ $gt: ['$count', 0] }, 1, 0] } },
                    outOfStock: { $sum: { $cond: [{ $eq: ['$count', 0] }, 1, 0] } },
                    lowStock: {
                        $sum: {
                            $cond: [{
                                $and: [
                                    { $gt: ['$count', 0] },
                                    { $lte: ['$count', 10] }
                                ]
                            }, 1, 0]
                        }
                    },
                    totalStockValue: { $sum: { $multiply: ['$count', { $ifNull: ['$discountPrice', '$price'] }] } }
                }
            }
        ]);

        // Mijoz statistikalari (agar customer model bo'lsa)
        const customerStats = {
            total: 0,
            active: 0,
            new: 0
        };

        res.json({
            success: true,
            data: {
                daily: dailyStats[0] || { revenue: 0, orders: 0, items: 0, avgOrderValue: 0 },
                weekly: weeklyStats[0] || { revenue: 0, orders: 0, items: 0, avgDailyRevenue: 0 },
                monthly: monthlyStats[0] || { revenue: 0, orders: 0, items: 0, avgOrderValue: 0 },
                yearly: yearlyStats[0] || { revenue: 0, orders: 0, items: 0, avgMonthlyRevenue: 0 },
                products: productStats[0] || {
                    totalProducts: 0,
                    inStock: 0,
                    outOfStock: 0,
                    lowStock: 0,
                    totalStockValue: 0
                },
                customers: customerStats,
                performance: {
                    conversionRate: 0,
                    avgSessionDuration: '0:00',
                    bounceRate: 0
                }
            },
            updatedAt: now
        });
    } catch (error) {
        console.error('Widgets error:', error);
        res.status(500).json({
            success: false,
            message: 'Server xatosi',
            error: error.message
        });
    }
});

export default router;