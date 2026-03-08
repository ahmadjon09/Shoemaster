import Order from '../models/order.js'
import Product from '../models/product.js'
import Client from "../models/client.js"
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js'
import mongoose from 'mongoose';
import User from "../models/user.js"
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
    return value.map(v => {
      if (typeof v === "object") {
        try {
          return JSON.stringify(v);
        } catch {
          return String(v);
        }
      }
      return String(v);
    }).join(", ");
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

const cloneData = (data) => JSON.parse(JSON.stringify(data));

const getStatusLabel = (status) => {
  const map = {
    pending: "Кутилмоқда",
    accepted: "Қабул қилинди",
    processing: "Тайёрланмоқда",
    delivered: "Етказилди",
    cancelled: "Бекор қилинди"
  };
  return map[status] || status || "—";
};

const buildClientBlock = (clientInfo, customer) => {
  let text = "";

  if (clientInfo) {
    text += `👤 <b>Мижоз:</b> ${escapeHtml(clientInfo.fullName || customer?.fullName || "—")}\n`;
    text += `📞 <b>Телефон:</b> ${escapeHtml(clientInfo.phoneNumber || customer?.phoneNumber || "—")}\n`;
    return text;
  }

  if (customer) {
    text += `👤 <b>Мижоз:</b> ${escapeHtml(customer.fullName || "—")}\n`;
    if (customer.phoneNumber) {
      text += `📞 <b>Телефон:</b> ${escapeHtml(customer.phoneNumber)}\n`;
    }
    return text;
  }

  text += `👤 <b>Мижоз:</b> —\n`;
  return text;
};

const buildProductsSnapshot = async (orderProducts = []) => {
  const productIds = orderProducts.map(p => p.product).filter(Boolean);

  const productsFromDB = await Product.find({
    _id: { $in: productIds }
  }).lean();

  const productsMap = {};
  productsFromDB.forEach(p => {
    productsMap[p._id.toString()] = p;
  });

  return orderProducts.map(item => {
    const dbProduct = productsMap[item.product?.toString()] || {};

    return {
      product: item.product,
      title: dbProduct.title || item.title || "—",
      sku: dbProduct.sku || item.sku || "—",
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      lineTotal: Number(item.quantity || 0) * Number(item.price || 0)
    };
  });
};

const buildOrderProductsText = (products = []) => {
  if (!products.length) {
    return `📦 <b>Маҳсулотлар:</b> —\n`;
  }

  let text = `📦 <b>Маҳсулотлар:</b>\n`;

  products.forEach((p, idx) => {
    text += `   ${idx === products.length - 1 ? "└" : "├"}─ <b>${idx + 1}. ${escapeHtml(p.title || "—")}</b>\n`;
    text += `   ${idx === products.length - 1 ? " " : "│"}   ├─ ART: <code>${escapeHtml(p.sku || "—")}</code>\n`;
    text += `   ${idx === products.length - 1 ? " " : "│"}   ├─ Миқдор: <code>${p.quantity}</code> дона\n`;
    text += `   ${idx === products.length - 1 ? " " : "│"}   ├─ Нарх: <code>${p.price}</code>\n`;
    text += `   ${idx === products.length - 1 ? " " : "│"}   └─ Жами: <code>${p.lineTotal}</code>\n`;
  });

  return text;
};

const buildOrderMainInfo = ({ order, clientInfo, productsSnapshot }) => {
  let text = "";

  text += `🧾 <b>Order ID:</b> <code>${escapeHtml(order._id || "—")}</code>\n`;
  text += buildClientBlock(clientInfo, order.customer);
  text += `📌 <b>Статус:</b> ${escapeHtml(getStatusLabel(order.status))}\n`;
  text += `💳 <b>Тўлов:</b> ${order.paid ? "Тўланган" : "Тўланмаган"}\n`;
  text += `💰 <b>Жами:</b> <code>${order.total ?? 0}</code>\n`;

  if (order.noClient) {
    text += `🚫 <b>Клиент базага сақланмаган</b>\n`;
  }

  if (order.orderDate) {
    text += `📅 <b>Сана:</b> ${escapeHtml(new Date(order.orderDate).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" }))}\n`;
  }

  text += `\n`;
  text += buildOrderProductsText(productsSnapshot);

  return text;
};

const buildOrderDiff = (oldOrder, newOrder) => {
  const changes = {};

  if ((oldOrder.status || "") !== (newOrder.status || "")) {
    changes.status = {
      old: getStatusLabel(oldOrder.status),
      new: getStatusLabel(newOrder.status)
    };
  }

  if (Boolean(oldOrder.paid) !== Boolean(newOrder.paid)) {
    changes.paid = {
      old: oldOrder.paid ? "Тўланган" : "Тўланмаган",
      new: newOrder.paid ? "Тўланган" : "Тўланмаган"
    };
  }

  if (Number(oldOrder.total || 0) !== Number(newOrder.total || 0)) {
    changes.total = {
      old: Number(oldOrder.total || 0),
      new: Number(newOrder.total || 0)
    };
  }

  const oldProducts = JSON.stringify(oldOrder.products || []);
  const newProducts = JSON.stringify(newOrder.products || []);

  if (oldProducts !== newProducts) {
    changes.products = {
      old: "Эски маҳсулотлар таркиби",
      new: "Янги маҳсулотлар таркиби"
    };
  }

  return changes;
};

const buildChangesText = (changes = {}) => {
  const entries = Object.entries(changes);
  if (!entries.length) return `   └─ Ўзгариш йўқ\n`;

  let text = "";

  entries.forEach(([field, values], index) => {
    const isLast = index === entries.length - 1;

    let label = field;
    if (field === "status") label = "Статус";
    if (field === "paid") label = "Тўлов ҳолати";
    if (field === "total") label = "Жами сумма";
    if (field === "products") label = "Маҳсулотлар";

    text += `   ${isLast ? "└" : "├"}─ <b>${escapeHtml(label)}</b>\n`;
    text += `   ${isLast ? " " : "│"}   ├─ Олдин: <code>${escapeHtml(formatValue(values.old))}</code>\n`;
    text += `   ${isLast ? " " : "│"}   └─ Янги: <code>${escapeHtml(formatValue(values.new))}</code>\n`;
  });

  return text;
};

const buildOrderNotificationMessage = ({
  eventType,
  order,
  oldOrder = null,
  clientInfo = null,
  productsSnapshot = [],
  oldProductsSnapshot = [],
  changes = {}
}) => {
  let header = "📝 <b>БУЮРТМА БЎЙИЧА ЯНГИЛАНИШ</b>";
  if (eventType === "created") header = "🟢 <b>ЯНГИ БУЮРТМА</b>";
  if (eventType === "updated") header = "🔵 <b>БУЮРТМА ЯНГИЛАНДИ</b>";
  if (eventType === "cancelled") header = "🔴 <b>БУЮРТМА БЕКОР ҚИЛИНДИ</b>";

  let message = `${header}\n`;
  message += `━━━━━━━━━━━━━━━━━━\n\n`;

  message += buildOrderMainInfo({
    order,
    clientInfo,
    productsSnapshot
  });

  message += `\n`;

  if (eventType === "updated") {
    message += `🛠 <b>Ўзгарган майдонлар:</b>\n`;
    message += buildChangesText(changes);
    message += `\n`;

    if (changes.products && oldProductsSnapshot.length) {
      message += `📦 <b>Олдинги маҳсулотлар:</b>\n`;
      oldProductsSnapshot.forEach((p, idx) => {
        message += `   ${idx === oldProductsSnapshot.length - 1 ? "└" : "├"}─ ${escapeHtml(p.title)} | ART: <code>${escapeHtml(p.sku)}</code> | ${p.quantity} дона | ${p.price}\n`;
      });
      message += `\n`;
    }
  }

  if (eventType === "cancelled" && oldOrder) {
    message += `↩️ <b>Омборга қайтарилди:</b>\n`;
    oldProductsSnapshot.forEach((p, idx) => {
      message += `   ${idx === oldProductsSnapshot.length - 1 ? "└" : "├"}─ ${escapeHtml(p.title)} | ART: <code>${escapeHtml(p.sku)}</code> | +${p.quantity} дона\n`;
    });
    message += `\n`;
  }

  message += `━━━━━━━━━━━━━━━━━━\n`;
  message += `🕒 <b>Вақт:</b> ${escapeHtml(getTashkentTime())}`;

  return message;
};

const sendOrderNotification = async ({
  eventType,
  order,
  oldOrder = null,
  changes = {}
}) => {
  try {
    if (!order) return;

    const users = await User.find({
      isLoggedIn: true,
      telegramId: { $exists: true, $ne: null }
    }).lean();

    if (!users.length && !process.env.GROUP_ID) return;

    let clientInfo = null;
    if (order.client) {
      clientInfo = await Client.findById(order.client).lean();
    }

    const productsSnapshot = await buildProductsSnapshot(order.products || []);
    const oldProductsSnapshot = oldOrder
      ? await buildProductsSnapshot(oldOrder.products || [])
      : [];

    const message = buildOrderNotificationMessage({
      eventType,
      order,
      oldOrder,
      clientInfo,
      productsSnapshot,
      oldProductsSnapshot,
      changes
    });

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

    if (process.env.GROUP_ID) {
      try {
        await bot.telegram.sendMessage(process.env.GROUP_ID, message, {
          parse_mode: "HTML",
          disable_web_page_preview: true
        });
        console.log("👥 Order xabari groupga yuborildi ✅");
      } catch (err) {
        console.error("❌ Groupga yuborishda xatolik:", err.message);
      }
    }

    console.log("✅ Order notification yuborildi");
  } catch (err) {
    console.error("❌ Order bot xatoligi:", err.message);
  }
};

/* =========================================================
   GET ALL
========================================================= */

export const AllOrders = async (_, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate('client', 'fullName phoneNumber')
      .populate('products.product', 'title mainImages price sku');

    const enrichedOrders = orders.map(order => {
      const enrichedProducts = order.products.map(item => {
        const product = item.product;

        return {
          ...item.toObject(),
          productName: product?.title || 'Deleted product',
          productImages: product?.mainImages || [],
          productSku: product?.sku || "—"
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

/* =========================================================
   CREATE ORDER
========================================================= */

export const NewOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { customer, client, clientId, products, status } = req.body;

    if (!customer) {
      await session.abortTransaction();
      session.endSession();
      return sendErrorResponse(res, 400, "Мижоз маълумоти йўқ!");
    }

    if (!Array.isArray(products) || products.length === 0) {
      await session.abortTransaction();
      session.endSession();
      return sendErrorResponse(res, 400, "Маҳсулот йўқ!");
    }

    let clientToUse = null;
    let noClient = false;

    if (clientId) {
      const existingClient = await Client.findById(clientId).session(session);
      if (!existingClient) {
        await session.abortTransaction();
        session.endSession();
        return sendErrorResponse(res, 404, "Мижоз топилмади!");
      }
      clientToUse = existingClient._id;
    } else if (client) {
      let found = await Client.findOne({ phoneNumber: client.phoneNumber }).session(session);
      if (!found) {
        const createdClients = await Client.create([client], { session });
        found = createdClients[0];
      }
      clientToUse = found._id;
    } else {
      noClient = true;
    }

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
      if (!product) throw new Error("Маҳсулот топилмади");

      const quantity = Number(item.quantity);
      const price = Number(item.price ?? product.price ?? 0);

      if (!quantity || quantity <= 0) {
        throw new Error(`"${product.title}" учун миқдор нотўғри`);
      }

      if (Number(product.count || 0) < quantity) {
        throw new Error(`"${product.title}" учун етарли миқдор йўқ`);
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: product._id },
          update: {
            $inc: {
              count: -quantity,
              sold: quantity
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

    await Product.bulkWrite(bulkOps, { session });

    const total = updatedProducts.reduce(
      (sum, p) => sum + (Number(p.price) * Number(p.quantity)),
      0
    );

    const createdOrders = await Order.create([{
      customer,
      client: clientToUse,
      noClient,
      products: updatedProducts,
      total,
      paid: false,
      status: status || "pending",
      orderDate: new Date()
    }], { session });

    await session.commitTransaction();
    session.endSession();

    await sendOrderNotification({
      eventType: "created",
      order: cloneData(createdOrders[0].toObject ? createdOrders[0].toObject() : createdOrders[0])
    });

    return res.status(201).json({
      message: "Буюртма яратилди ✅",
      data: createdOrders[0]
    });

  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error(err);
    return sendErrorResponse(res, 500, err.message);
  }
};

/* =========================================================
   CANCEL ORDER
========================================================= */

export const CancelOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const order = await Order.findById(req.params.id).session(session);

    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return sendErrorResponse(res, 404, "Буюртма топилмади!");
    }

    const oldOrder = cloneData(order.toObject ? order.toObject() : order);

    const bulkOps = order.products.map(item => ({
      updateOne: {
        filter: { _id: item.product },
        update: {
          $inc: {
            count: Number(item.quantity || 0),
            sold: -Number(item.quantity || 0)
          }
        }
      }
    }));

    if (bulkOps.length) {
      await Product.bulkWrite(bulkOps, { session });
    }

    await Order.findByIdAndDelete(order._id).session(session);

    await session.commitTransaction();
    session.endSession();

    await sendOrderNotification({
      eventType: "cancelled",
      order: oldOrder,
      oldOrder
    });

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

/* =========================================================
   UPDATE ORDER
========================================================= */

export const UpdateOrder = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { products, status, paid } = req.body;

    const order = await Order.findById(id).session(session);
    if (!order) {
      await session.abortTransaction();
      session.endSession();
      return sendErrorResponse(res, 404, "Буюртма топилмади!");
    }

    const oldOrder = cloneData(order.toObject ? order.toObject() : order);

    if (status !== undefined) order.status = status;
    if (paid !== undefined) order.paid = paid;

    if (products && Array.isArray(products)) {
      const revertBulkOps = order.products.map(item => ({
        updateOne: {
          filter: { _id: item.product },
          update: {
            $inc: {
              count: Number(item.quantity || 0),
              sold: -Number(item.quantity || 0)
            }
          }
        }
      }));

      if (revertBulkOps.length) {
        await Product.bulkWrite(revertBulkOps, { session });
      }

      const productIds = products.map(p => p.product);
      const dbProducts = await Product.find({
        _id: { $in: productIds }
      }).session(session);

      if (dbProducts.length !== products.length) {
        throw new Error("Айрим маҳсулотлар топилмади");
      }

      const productMap = new Map();
      dbProducts.forEach(p => productMap.set(String(p._id), p));

      const newBulkOps = [];
      const updatedProducts = [];

      for (const item of products) {
        const product = productMap.get(String(item.product));
        if (!product) throw new Error("Маҳсулот топилмади");

        const quantity = Number(item.quantity);
        const price = Number(item.price ?? product.price ?? 0);

        if (!quantity || quantity <= 0) {
          throw new Error(`"${product.title}" учун миқдор нотўғри`);
        }

        if (Number(product.count || 0) < quantity) {
          throw new Error(`"${product.title}" учун етарли миқдор йўқ!`);
        }

        newBulkOps.push({
          updateOne: {
            filter: { _id: product._id },
            update: {
              $inc: {
                count: -quantity,
                sold: quantity
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

      if (newBulkOps.length) {
        await Product.bulkWrite(newBulkOps, { session });
      }

      order.products = updatedProducts;
      order.total = updatedProducts.reduce(
        (sum, p) => sum + (Number(p.price) * Number(p.quantity)),
        0
      );
    }

    await order.save({ session });

    const newOrder = cloneData(order.toObject ? order.toObject() : order);
    const changes = buildOrderDiff(oldOrder, newOrder);

    await session.commitTransaction();
    session.endSession();

    if (Object.keys(changes).length > 0) {
      await sendOrderNotification({
        eventType: "updated",
        order: newOrder,
        oldOrder,
        changes
      });
    }

    return res.status(200).json({
      data: order,
      message: "Буюртма муваффақиятли янгиланди ✅"
    });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("❌ Буюртма янгилашда хатолик:", error);
    sendErrorResponse(res, 500, error.message || "Сервер хатолиги!");
  }
};