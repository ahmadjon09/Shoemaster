import Product from '../models/product.js'
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js'
import Users from "../models/user.js"
import { bot } from '../bot.js';

/* =========================================================
   HELPERS
========================================================= */

const escapeHtml = (text = "") => {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
};

const formatValue = (value) => {
  if (value === undefined || value === null || value === "") return "—";

  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return value.join(", ");
  }

  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
};

const getTashkentTime = () => {
  return new Date().toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
};

const cloneProduct = (product) => {
  if (!product) return null;
  return JSON.parse(JSON.stringify(product));
};

const buildDiff = (oldData = {}, newData = {}) => {
  const fields = ["title", "sku", "category", "description", "count", "mainImages", "status"];
  const changes = {};

  for (const field of fields) {
    const oldVal = oldData[field];
    const newVal = newData[field];

    const oldString = JSON.stringify(oldVal ?? null);
    const newString = JSON.stringify(newVal ?? null);

    if (oldString !== newString) {
      changes[field] = {
        old: oldVal,
        new: newVal
      };
    }
  }

  return changes;
};

const buildProductBaseInfo = (product = {}) => {
  let text = "";

  text += `📌 <b>Номи:</b> ${escapeHtml(product.title || "—")}\n`;
  text += `🆔 <b>ART:</b> <code>${escapeHtml(product.sku || "—")}</code>\n`;
  text += `📂 <b>Категория:</b> ${escapeHtml(product.category || "—")}\n`;
  text += `📦 <b>Қолдиқ:</b> ${escapeHtml(product.count ?? 0)} дона\n`;

  if (product.status !== undefined) {
    text += `📍 <b>Статус:</b> ${escapeHtml(product.status || "—")}\n`;
  }

  if (product.description) {
    text += `📝 <b>Тавсиф:</b> ${escapeHtml(product.description)}\n`;
  }

  if (product.mainImages?.length) {
    text += `🖼 <b>1-расм:</b> ${escapeHtml(product.mainImages[0])}\n`;
    text += `🖼 <b>Расмлар сони:</b> ${product.mainImages.length}\n`;
  } else {
    text += `🖼 <b>Расм:</b> —\n`;
  }

  return text;
};

const buildChangesText = (changes = {}) => {
  const entries = Object.entries(changes);
  if (!entries.length) return `   └─ Ўзгариш йўқ\n`;

  let text = "";

  for (let i = 0; i < entries.length; i++) {
    const [field, values] = entries[i];
    const isLast = i === entries.length - 1;

    let label = field;
    if (field === "sku") label = "ART";
    if (field === "title") label = "Номи";
    if (field === "category") label = "Категория";
    if (field === "description") label = "Тавсиф";
    if (field === "count") label = "Қолдиқ";
    if (field === "mainImages") label = "Расмлар";
    if (field === "status") label = "Статус";

    text += `   ${isLast ? "└" : "├"}─ <b>${escapeHtml(label)}</b>\n`;
    text += `   ${isLast ? " " : "│"}   ├─ Олдин: <code>${escapeHtml(formatValue(values.old))}</code>\n`;
    text += `   ${isLast ? " " : "│"}   └─ Янги: <code>${escapeHtml(formatValue(values.new))}</code>\n`;
  }

  return text;
};

const buildProductNotificationMessage = ({
  eventType,
  product = {},
  oldProduct = null,
  changes = {},
}) => {
  const time = getTashkentTime();

  let header = "📦 <b>МАҲСУЛОТ БЎЙИЧА ЯНГИЛАНИШ</b>";
  if (eventType === "created") header = "🟢 <b>ЯНГИ МАҲСУЛОТ ҚЎШИЛДИ</b>";
  if (eventType === "stock_added") header = "🟡 <b>МАҲСУЛОТ МИҚДОРИ ОШИРИЛДИ</b>";
  if (eventType === "updated") header = "🔵 <b>МАҲСУЛОТ ТАҲРИРЛАНДИ</b>";
  if (eventType === "deleted") header = "🔴 <b>МАҲСУЛОТ ЎЧИРИЛДИ</b>";

  let message = `${header}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;

  message += buildProductBaseInfo(product);
  message += `\n`;

  if (eventType === "created") {
    message += `➕ <b>Амал:</b> Янги маҳсулот базага қўшилди\n\n`;
  }

  if (eventType === "stock_added" && oldProduct) {
    const oldCount = Number(oldProduct.count || 0);
    const newCount = Number(product.count || 0);
    const added = newCount - oldCount;

    message += `📈 <b>Омбор ўзгариши:</b>\n`;
    message += `   ├─ Олдинги қолдиқ: <code>${oldCount}</code>\n`;
    message += `   ├─ Қўшилган: <code>+${added}</code>\n`;
    message += `   └─ Янги қолдиқ: <code>${newCount}</code>\n\n`;
  }

  if (eventType === "updated") {
    message += `🛠 <b>Ўзгарган майдонлар:</b>\n`;
    message += buildChangesText(changes);
    message += `\n`;
  }

  if (eventType === "deleted" && oldProduct) {
    message += `🗑 <b>Ўчиришдан олдинги ҳолати:</b>\n`;
    message += `   ├─ Номи: ${escapeHtml(oldProduct.title || "—")}\n`;
    message += `   ├─ ART: <code>${escapeHtml(oldProduct.sku || "—")}</code>\n`;
    message += `   ├─ Категория: ${escapeHtml(oldProduct.category || "—")}\n`;
    message += `   └─ Қолдиқ: ${escapeHtml(oldProduct.count ?? 0)} дона\n\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `🕒 <b>Вақт:</b> ${escapeHtml(time)}`;

  return message;
};

const sendBotNotification = async ({
  eventType,
  product,
  oldProduct = null,
  changes = {}
}) => {
  try {
    if (!product) return;

    const users = await Users.find({
      isLoggedIn: true,
      telegramId: { $exists: true, $ne: null }
    }).lean();

    if (!users.length && !process.env.GROUP_ID) return;

    const message = buildProductNotificationMessage({
      eventType,
      product,
      oldProduct,
      changes
    });

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

    console.log("✅ Bot xabari muvaffaqiyatli yuborildi");
  } catch (err) {
    console.error("❌ Bot notification xatoligi:", err.message);
  }
};

/* =========================================================
   CREATE
========================================================= */

export const CreateNewProduct = async (req, res) => {
  try {
    const data = req.body;

    if (!data.sku) {
      return res.status(400).json({
        message: "ART мажбурий",
      });
    }

    const incomingCount = Number(data.count) || 0;

    const existingProduct = await Product.findOne({ sku: data.sku });

    if (existingProduct) {
      const oldProduct = cloneProduct(existingProduct.toObject ? existingProduct.toObject() : existingProduct);

      existingProduct.count = Number(existingProduct.count || 0) + incomingCount;
      await existingProduct.save();

      const updatedProduct = cloneProduct(existingProduct.toObject ? existingProduct.toObject() : existingProduct);

      if (incomingCount > 0) {
        await sendBotNotification({
          eventType: "stock_added",
          product: updatedProduct,
          oldProduct
        });
      }

      return res.status(200).json({
        message: "Маҳсулот миқдори янгиланди ✅",
        product: existingProduct,
        updated: true
      });
    }

    const newProduct = await Product.create({
      title: data.title,
      sku: data.sku,
      category: data.category,
      mainImages: data.mainImages || [],
      description: data.description || "",
      count: incomingCount,
      status: data.status
    });

    await sendBotNotification({
      eventType: "created",
      product: cloneProduct(newProduct.toObject ? newProduct.toObject() : newProduct)
    });

    return res.status(201).json({
      message: "Маҳсулот муваффақиятли яратилди ✅",
      product: newProduct,
      created: true
    });

  } catch (error) {
    console.error("CreateNewProduct error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        message: "Бу ART аллақачон мавжуд!",
      });
    }

    return res.status(500).json({
      message: "Серверда хатолик юз берди!",
    });
  }
};

/* =========================================================
   GET ALL
========================================================= */

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

    if (category) {
      query.category = category;
    }

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
      query.count = { $gt: 0 };
    }

    if (type === 'out-of-stock') {
      query.count = { $eq: 0 };
    }

    if (search) {
      const safeSearch = search.trim();

      query.$or = [
        { title: { $regex: `^${safeSearch}`, $options: 'i' } },
        { sku: { $regex: `^${safeSearch}`, $options: 'i' } }
      ];
    }

    const total = await Product.countDocuments(query);

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
      .lean({ virtuals: true });

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

/* =========================================================
   UPDATE
========================================================= */

export const UpdateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return sendErrorResponse(res, 404, "Маҳсулот топилмади!");
    }

    const oldProduct = cloneProduct(product.toObject ? product.toObject() : product);

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

    const allowedFields = [
      "title",
      "category",
      "mainImages",
      "status",
      "description",
      "sku"
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        product[field] = req.body[field];
      }
    });

    await product.save();

    const newProduct = cloneProduct(product.toObject ? product.toObject() : product);
    const changes = buildDiff(oldProduct, newProduct);

    if (Object.keys(changes).length > 0) {
      await sendBotNotification({
        eventType: "updated",
        product: newProduct,
        oldProduct,
        changes
      });
    }

    return res.json({
      message: "Маҳсулот муваффақиятли янгиланди ✅",
      data: product
    });

  } catch (error) {
    console.error("UpdateProduct Error:", error);
    return sendErrorResponse(res, 500, "Сервер хатолиги!");
  }
};

/* =========================================================
   DELETE
========================================================= */

export const DeleteProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Маҳсулот топилмади!" });
    }

    const oldProduct = cloneProduct(product.toObject ? product.toObject() : product);

    await product.deleteOne();

    await sendBotNotification({
      eventType: "deleted",
      product: oldProduct,
      oldProduct
    });

    return res.status(200).json({
      message: 'Mahsulot muvaffaqiyatli o‘chirildi.'
    });

  } catch (error) {
    if (error.name === 'CastError') {
      return sendErrorResponse(res, 400, 'Noto‘g‘ri mahsulot ID si.')
    }

    return sendErrorResponse(
      res,
      500,
      'Serverda xatolik yuz berdi. Iltimos, keyinroq urinib ko‘ring!',
      error
    );
  }
};

/* =========================================================
   SCANNER
========================================================= */

export const Scanner = async (req, res) => {
  const { id } = req.params;
  try {
    const product = await Product.findOne({ sku: id });
    if (!product) {
      return sendErrorResponse(res, 404, 'топилмади!');
    }
    return res.status(200).json({ product });
  } catch (error) {
    console.log(error);
    return sendErrorResponse(
      res,
      500,
      'Сервер хатолиги. Илтимос, кейинроқ уриниб кўринг!',
      error
    );
  }
};

/* =========================================================
   CHECK SKU / ART
========================================================= */

export const CheckSku = async (req, res) => {
  try {
    const { sku } = req.query;

    if (!sku) {
      return res.status(400).json({
        message: "ART юборилмади",
      });
    }

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