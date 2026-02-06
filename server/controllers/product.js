import Product from '../models/product.js'
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js'
import Users from "../models/user.js"
import { bot } from '../bot.js';

const buildProductMessage = (products) => {
  const time = new Date().toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent"
  });

  let message = products.removed ? `❌ ЎЧИРИЛДИ\n` : `📦 <b>ЯНГИ / ЯНГИЛАНГАН МАҲСУЛОТЛАР</b>\n`;
  message += `━━━━━━\n\n`;

  products.forEach((product, index) => {
    message += `▫️ <b>${index + 1}. ${product.title}</b>\n`;

    if (product.sku) {
      message += `   ├─ 🆔 АРТ: <code>${product.sku}</code>\n`;
    }

    if (product.addedCount) {
      message += `   ├─ ➕ Қўшилди: ${product.addedCount} дона\n`;
    }

    if (product.removed) {
      message += `   ├─ ❌ ЎЧИРИЛДИ\n`;
    }

    if (product.category) {
      message += `   ├─ 📂 Категория: ${product.category}\n`;
    }

    if (typeof product.count === "number") {
      message += `   ├─ 📦 Қолдиқ: ${product.count} дона\n`;
    }

    if (product.mainImages?.length) {
      message += `   ├─ 🖼 Расм: ${product.mainImages[0]}\n`;
    }

    message += `\n`;
  });

  message += `━━━━━━━━━━\n`;
  message += `🕒 ${time}`;

  return message;
};

const sendBotNotification = async (products) => {
  try {
    if (!products?.length) return;

    const users = await Users.find({
      isLoggedIn: true,
      telegramId: { $exists: true, $ne: null }
    }).lean();

    if (!users.length && !process.env.GROUP_ID) return;

    const message = buildProductMessage(products);

    // 👤 USERLARGA
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.telegramId, message, {
          parse_mode: "HTML",
          disable_web_page_preview: false
        });
      } catch (err) {
        console.error(`❌ Userga yuborilmadi (${user.telegramId}):`, err.message);
      }
    }

    // 👥 GROUPGA
    if (process.env.GROUP_ID) {
      try {
        await bot.telegram.sendMessage(process.env.GROUP_ID, message, {
          parse_mode: "HTML",
          disable_web_page_preview: false
        });
        console.log("👥 Groupga yuborildi ✅");
      } catch (err) {
        console.error("❌ Groupga yuborishda xatolik:", err.message);
      }
    }

    console.log("✅ Bot habarlar muvaffaqiyatli yuborildi");
  } catch (err) {
    console.error("❌ Bot notification xatoligi:", err.message);
  }
};

export const CreateNewProduct = async (req, res) => {
  try {
    const data = req.body;

    if (!data.sku) {
      return res.status(400).json({
        message: "SKU мажбурий",
      });
    }

    const incomingCount = Number(data.count) || 0;

    /* =======================
       1️⃣ SKU bo‘yicha qidirish
    ======================= */
    const existingProduct = await Product.findOne({ sku: data.sku });

    /* =======================
       2️⃣ Agar product mavjud bo‘lsa
    ======================= */
    if (existingProduct) {
      const oldCount = existingProduct.count || 0;
      const addedCount = incomingCount

      existingProduct.count = oldCount + incomingCount;
      await existingProduct.save();

      // agar yangi miqdor oshsa, botga yubor
      if (incomingCount) {
        sendBotNotification([{
          title: existingProduct.title,
          sku: existingProduct.sku,
          category: existingProduct.category,
          mainImages: existingProduct.mainImages,
          count: existingProduct.count,
          addedCount
        }]);
      }

      return res.status(200).json({
        message: "Маҳсулот миқдори янгиланди ✅",
        product: existingProduct,
        updated: true
      });
    }

    /* =======================
       3️⃣ Aks holda yangi product
    ======================= */
    const newProduct = await Product.create({
      title: data.title,
      sku: data.sku,
      category: data.category,
      gender: data.gender,
      season: data.season,
      material: data.material,
      mainImages: data.mainImages || [],
      description: data.description || "",
      count: incomingCount
    });

    // yangi product botga
    sendBotNotification([{
      title: newProduct.title,
      sku: newProduct.sku,
      category: newProduct.category,
      mainImages: newProduct.mainImages,
      count: newProduct.count,
      addedCount: incomingCount
    }]);

    return res.status(201).json({
      message: "Маҳсулот муваффақиятли яратилди ✅",
      product: newProduct,
      created: true
    });

  } catch (error) {
    console.error("CreateNewProduct error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Бу SKU аллақачон мавжуд!",
      });
    }

    return res.status(500).json({
      message: "Серверда хатолик юз берди!",
    });
  }
};



export const GetAllProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      category = '',
      date = '',
      type = 'all'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const query = {};

    // 📂 Category filter
    if (category) {
      query.category = category;
    }

    // 📅 Date filter
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }
    if (type === 'in-stock') {
      query.count = { $gt: 0 }; // count > 0
    }

    if (type === 'out-of-stock') {
      query.count = { $eq: 0 }; // count === 0
    }
    // 🔍 Search (title + sku)
    if (search) {
      const safeSearch = search.trim();

      query.$or = [
        { title: { $regex: `^${safeSearch}`, $options: 'i' } },
        { sku: { $regex: `^${safeSearch}`, $options: 'i' } }
      ];
    }

    // 📊 TOTAL PRODUCT COUNT
    const total = await Product.countDocuments(query);

    // 📦 TOTAL COUNT (sum of product.count)
    const totalCountAgg = await Product.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalCount: { $sum: { $ifNull: ["$count", 0] } }
        }
      }
    ]);

    const totalCount = totalCountAgg[0]?.totalCount || 0;

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true })
    return res.status(200).json({
      data: products,
      total,
      totalCount,
      pagination: {
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('GetAllProducts Error:', error);
    return res.status(500).json({
      message: "Serverda xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring!",
      error: error.message
    });
  }
};


export const UpdateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return sendErrorResponse(res, 404, "Маҳсулот топилмади!");
    }

    // 🔒 COUNT
    if (req.body.count !== undefined) {
      const raw = req.body.count;
      const parsed = typeof raw === "object"
        ? Number(raw.count)
        : Number(raw);

      if (isNaN(parsed)) {
        return sendErrorResponse(res, 400, "count нотўғри форматда!");
      }

      product.count = parsed;
    }

    // 🔹 boshqa maydonlar
    const allowedFields = [
      "title",
      "price",
      "category",
      "season",
      "material",
      "gender",
      "mainImages",
      "status"
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    return res.json({
      message: "Маҳсулот муваффақиятли янгиланди ✅",
      data: product
    });

  } catch (error) {
    console.error("UpdateProduct Error:", error);
    return sendErrorResponse(res, 500, "Сервер хатолиги!");
  }
};


export const DeleteProduct = async (req, res) => {
  const { id } = req.params
  try {

    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({ message: "Маҳсулот топилмади!" });
    }

    await product.deleteOne();

    sendBotNotification([{
      title: product.title,
      sku: product.sku,
      category: product.category,
      mainImages: product.mainImages,
      count: product.count,
      removed: true
    }]);
    return res
      .status(200)
      .json({ message: 'Mahsulot muvaffaqiyatli o‘chirildi.' })
  } catch (error) {
    if (error.name === 'CastError') {  // error.title emas, error.name bo‘lishi kerak
      return sendErrorResponse(res, 400, 'Noto‘g‘ri mahsulot ID si.')
    }
    return sendErrorResponse(
      res,
      500,
      'Serverda xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring!',
      error
    )
  }
}


export const Scanner = async (req, res) => {
  const { id } = req.params
  try {
    const product = await Product.findOne({ sku: id })
    if (!product) {
      return sendErrorResponse(res, 404, 'топилмади!')
    }
    return res.status(200).json({ product })
  } catch (error) {
    console.log(error);
    return sendErrorResponse(
      res,
      500,
      'Сервер хатолиги. Илтимос, кейинроқ уриниб кўринг!',
      error
    )
  }
}

export const CheckSku = async (req, res) => {
  try {
    const { sku } = req.query;

    if (!sku) {
      return res.status(400).json({
        message: "SKU юборилмади",
      });
    }

    // 🔹 Async query uchun await kerak
    const product = await Product.findOne({ sku });

    if (!product) {
      return res.status(404).json({
        message: "Топилмади",
      });
    }

    return res.status(200).json({
      sku,
      product
    });

  } catch (error) {
    console.error("CheckSku error:", error);
    return res.status(500).json({
      message: "Серверда хатолик юз берди!",
    });
  }
};
