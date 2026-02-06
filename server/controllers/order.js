import Order from '../models/order.js'
import Product from '../models/product.js'
import Client from "../models/client.js"
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js'
import mongoose from 'mongoose';
import User from "../models/user.js"
import { bot } from '../bot.js';

export const AllOrders = async (_, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('client', 'fullName phoneNumber')
      .populate('products.product', 'title mainImages price');

    const enrichedOrders = orders.map(order => {
      const enrichedProducts = order.products.map(item => {
        const product = item.product;

        return {
          ...item.toObject(),
          productName: product?.title || 'Deleted product',
          productImages: product?.mainImages || []
        };
      });

      return {
        ...order.toObject(),
        products: enrichedProducts
      };
    });

    return res.status(200).json({ data: enrichedOrders });
  } catch (error) {
    console.error('❌ Error in AllOrders:', error);
    sendErrorResponse(res, 500, 'Server Error');
  }
};

const buildOrderMessage = (order, productsMap, clientInfo) => {
  let message = `📝 <b>ЯНГИ БУЮРТМА</b>\n`;
  message += `━━━━━━\n\n`;

  // 👤 Client info
  if (clientInfo) {
    message += `👤 Мижоз: <b>${clientInfo.fullName || "—"}</b>\n`;
    if (clientInfo.phoneNumber) {
      message += `📞 Телефон: <b>${clientInfo.phoneNumber}</b>\n`;
    }
    message += `\n`;
  }

  // 📦 Products
  order.products.forEach((p, idx) => {
    const productData = productsMap[p.product.toString()];
    const title = productData?.title || "—";

    message += `▫️ <b>${idx + 1}. ${title}</b>\n`;
    message += `   ├─ 🆔 АРТ: <code>${productData?.sku || "—"}</code>\n`;
    message += `   ├─ 📦 Миқдор: ${p.quantity} дона\n`;
    message += `   └─ 💰 Нархи: <b>${p.price}</b>\n\n`;
  });

  // 🕒 Time
  message += `━━━━━━━━━━\n`;
  message += `🕒 ${new Date().toLocaleString("uz-UZ", {
    timeZone: "Asia/Tashkent"
  })}`;

  return message;
};

const sendOrderNotification = async (order) => {
  try {
    if (!order?.products?.length) return;

    // 👤 Logged users
    const users = await User.find({
      isLoggedIn: true,
      telegramId: { $exists: true, $ne: null }
    }).lean();

    // 📦 Products from DB
    const productIds = order.products.map(p => p.product);
    const productsFromDB = await Product.find({
      _id: { $in: productIds }
    }).lean();

    const productsMap = {};
    productsFromDB.forEach(p => {
      productsMap[p._id.toString()] = p;
    });

    // 👤 Client
    let clientInfo = null;
    if (order.client) {
      clientInfo = await Client.findById(order.client).lean();
    }

    const message = buildOrderMessage(order, productsMap, clientInfo);

    // 👤 USERLARGA
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.telegramId, message, {
          parse_mode: "HTML",
          disable_web_page_preview: true
        });
      } catch (err) {
        console.error(
          `❌ Userga yuborilmadi (${user.telegramId}):`,
          err.message
        );
      }
    }

    // 👥 GROUP GA
    if (process.env.GROUP_ID) {
      try {
        await bot.telegram.sendMessage(process.env.GROUP_ID, message, {
          parse_mode: "HTML",
          disable_web_page_preview: true
        });
        console.log("👥 Buyurtma groupga yuborildi ✅");
      } catch (err) {
        console.error("❌ Groupga yuborishda xatolik:", err.message);
      }
    }

    console.log("✅ Buyurtma notification yuborildi");
  } catch (err) {
    console.error("❌ Buyurtma bot xatoligi:", err.message);
  }
};

export const NewOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customer, client, clientId, products, status } = req.body;

    if (!customer) {
      return sendErrorResponse(res, 400, "Мижоз маълумоти йўқ!");
    }

    if (!Array.isArray(products) || products.length === 0) {
      return sendErrorResponse(res, 400, "Маҳсулот йўқ!");
    }

    /* ========== CLIENT ========== */
    let clientToUse = null;
    let noClient = false;

    if (clientId) {
      const existingClient = await Client.findById(clientId);
      if (!existingClient) {
        return sendErrorResponse(res, 404, "Мижоз топилмади!");
      }
      clientToUse = existingClient._id;
    } else if (client) {
      let found = await Client.findOne({ phoneNumber: client.phoneNumber });
      if (!found) {
        found = await Client.create(client);
      }
      clientToUse = found._id;
    } else {
      noClient = true;
    }

    /* ========== PRODUCTS ========== */
    const productIds = products.map(p => p.product);

    const dbProducts = await Product.find({
      _id: { $in: productIds }
    }).session(session);

    if (dbProducts.length !== products.length) {
      throw new Error("Айрим маҳсулотлар топилмади");
    }

    const productMap = new Map();
    dbProducts.forEach(p => productMap.set(String(p._id), p));

    const bulkOps = [];
    const updatedProducts = [];

    for (const item of products) {
      const product = productMap.get(String(item.product));

      const quantity = Number(item.quantity);
      const price = Number(item.price ?? product.price);

      if (product.count < quantity) {
        throw new Error(`"${product.title}" учун етарли миқдор йўқ`);
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $inc: {
              count: -quantity,
              sold: quantity // 🔥 SOLD OSHADI
            }
          }
        }
      });

      updatedProducts.push({
        product: product._id,
        quantity,
        price
      });
    }

    // 🔥 BITTA ZARBADA UPDATE
    await Product.bulkWrite(bulkOps, { session });

    const total = updatedProducts.reduce(
      (sum, p) => sum + p.price * p.quantity,
      0
    );

    const newOrder = await Order.create([{
      customer,
      client: clientToUse,
      noClient,
      products: updatedProducts,
      total,
      paid: false,
      status,
      orderDate: new Date()
    }], { session });
    sendOrderNotification(newOrder[0]);
    await session.commitTransaction();
    session.endSession();

    return res.status(201).json({
      message: "Буюртма яратилди ✅",
      data: newOrder[0]
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return sendErrorResponse(res, 500, err.message);
  }
};

export const CancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      return sendErrorResponse(res, 404, "Буюртма топилмади!");
    }

    // productsni stokga qaytarish
    const bulkOps = order.products.map(item => ({
      updateOne: {
        filter: { _id: item.product },
        update: {
          $inc: {
            count: item.quantity,
            sold: -item.quantity
          }
        }
      }
    }));

    await Product.bulkWrite(bulkOps, { session });

    // orderni o‘chirish
    await Order.findByIdAndDelete(order._id).session(session);

    await session.commitTransaction();
    session.endSession();

    // 🔥 Botga xabar yuborish
    sendOrderCancelNotification(order);

    return res.json({
      message: "Буюртма бекор қилинди ❌"
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return sendErrorResponse(res, 500, "Сервер хатолиги");
  }
};

// Bot xabari
const sendOrderCancelNotification = async (order) => {
  try {
    if (!order) return;

    // 👤 Logged users
    const users = await User.find({
      isLoggedIn: true,
      telegramId: { $exists: true, $ne: null }
    }).lean();

    // 📦 Products from DB
    const productIds = order.products.map(p => p.product);
    const productsFromDB = await Product.find({
      _id: { $in: productIds }
    }).lean();

    const productsMap = {};
    productsFromDB.forEach(p => {
      productsMap[p._id.toString()] = p;
    });

    // 👤 Client
    let clientInfo = null;
    if (order.client) {
      clientInfo = await Client.findById(order.client).lean();
    }

    // message qurish
    let message = `📝 <b>БУЮРТМА БЕКОР ҚИЛИНДИ ❌</b>\n`;
    message += `━━━━━━\n\n`;

    if (clientInfo) {
      message += `👤 Мижоз: <b>${clientInfo.fullName || "—"}</b>\n`;
      if (clientInfo.phoneNumber) {
        message += `📞 Телефон: <b>${clientInfo.phoneNumber}</b>\n`;
      }
      message += `\n`;
    }

    order.products.forEach((p, idx) => {
      const productData = productsMap[p.product.toString()];
      const title = productData?.title || "—";

      message += `▫️ <b>${idx + 1}. ${title}</b>\n`;
      message += `   ├─ 🆔 АРТ: <code>${productData?.sku || "—"}</code>\n`;
      message += `   ├─ 📦 Миқдор: ${p.quantity} дона\n`;
      message += `   └─ 💰 Нархи: <b>${p.price}</b>\n\n`;
    });

    message += `━━━━━━━━━━\n`;
    message += `🕒 ${new Date().toLocaleString("uz-UZ", {
      timeZone: "Asia/Tashkent"
    })}`;

    // 👤 USERS
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.telegramId, message, {
          parse_mode: "HTML",
          disable_web_page_preview: true
        });
      } catch (err) {
        console.error(`❌ Userga yuborilmadi (${user.telegramId}):`, err.message);
      }
    }

    // 👥 GROUP
    if (process.env.GROUP_ID) {
      try {
        await bot.telegram.sendMessage(process.env.GROUP_ID, message, {
          parse_mode: "HTML",
          disable_web_page_preview: true
        });
        console.log("👥 Buyurtma bekor groupga yuborildi ✅");
      } catch (err) {
        console.error("❌ Groupga yuborishda xatolik:", err.message);
      }
    }

    console.log("✅ Buyurtma bekor notification yuborildi");

  } catch (err) {
    console.error("❌ Buyurtma bekor bot xatoligi:", err.message);
  }
};



export const UpdateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { products, status, paid } = req.body;

    const order = await Order.findById(id);
    if (!order) return sendErrorResponse(res, 404, "Буюртма топилмади!");

    // 🔹 Faqat status va paid ni yangilash mumkin
    if (status) order.status = status;
    if (paid !== undefined) order.paid = paid;

    // 🔹 Products yangilash (agar kerak bo'lsa)
    if (products && products.length) {
      // 🔹 Oldingi products countlarini qaytarish
      for (const oldItem of order.products) {
        const product = await Product.findById(oldItem.product);
        if (product && product.types[oldItem.variantIndex]) {
          product.types[oldItem.variantIndex].count += oldItem.quantity;
          product.sold = Math.max(0, product.sold - oldItem.quantity);
          await product.save();
        }
      }

      // 🔹 Yangi products countlarini kamaytirish
      const updatedProducts = [];
      for (const item of products) {
        const product = await Product.findById(item.product);
        if (!product) continue;

        const variantIndex = product.types.findIndex(t =>
          t.color === item.variant.color &&
          t.size === item.variant.size &&
          t.style === item.variant.style
        );

        if (variantIndex !== -1) {
          // 🔹 Count tekshirish
          if (product.types[variantIndex].count < item.quantity) {
            return sendErrorResponse(res, 400,
              `"${product.title}" учун етарли миқдор йўқ!`);
          }

          // 🔹 Countni kamaytirish
          product.types[variantIndex].count -= item.quantity;
          product.sold += item.quantity;
          await product.save();

          updatedProducts.push({
            product: item.product,
            variantIndex: variantIndex,
            variant: item.variant,
            quantity: item.quantity,
            price: item.price || product.price
          });
        }
      }

      order.products = updatedProducts;
      order.total = updatedProducts.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    }

    await order.save();

    return res.status(200).json({
      data: order,
      message: "Буюртма муваффақиятли янгиланди ✅"
    });

  } catch (error) {
    console.error("❌ Буюртма янгилашда хатолик:", error);
    sendErrorResponse(res, 500, "Сервер хатолиги!");
  }
};