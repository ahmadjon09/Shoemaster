import { Telegraf, Markup } from "telegraf";
import bcrypt from "bcryptjs";
import Users from "./models/user.js";
import dotenv from "dotenv";


dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
if (!TOKEN) throw new Error("❌ BOT_TOKEN env файлда топилмади!");

export const bot = new Telegraf(TOKEN);

// ===== 📦 STYLE КОНСТАНТАЛАРИ =====
const STYLES = {
    // 🎨 Emoji ва символлар
    ICONS: {
        SUCCESS: "✅",
        ERROR: "❌",
        WARNING: "⚠️",
        INFO: "ℹ️",
        LOADING: "⏳",
        LOCK: "🔐",
        USER: "👤",
        PHONE: "📱",
        EXIT: "🚪",
        REFRESH: "🔄",
        HELP: "❓",
        ADMIN: "👑",
        CALENDAR: "📅",
        SHIELD: "🛡️",
        ROCKET: "🚀",
        WAVE: "👋",
        STAR: "⭐",
        FIRE: "🔥",
        KEY: "🔑",
        BELL: "🔔",
        GEAR: "⚙️",
        CHART: "📊",
        HOME: "🏠",
        SEARCH: "🔍",
        CHECK: "✔️",
        CROSS: "✖️",
        ARROW_RIGHT: "➡️",
        SHIELD_CHECK: "✅",
        CLOCK: "⏰",
        DATABASE: "💾",
        TRASH: "🗑️",
        HOURGLASS: "⏳"
    },

    // 🎯 HTML Format функциялари
    HTML: {
        BOLD: (text) => `<b>${text}</b>`,
        ITALIC: (text) => `<i>${text}</i>`,
        CODE: (text) => `<code>${text}</code>`,
        LINK: (text, url) => `<a href="${url}">${text}</a>`,
        UNDERLINE: (text) => `<u>${text}</u>`,
        SPOILER: (text) => `<tg-spoiler>${text}</tg-spoiler>`,

        // Maxsus форматлар
        TITLE: (text, icon = "✨") => `${icon} <b>${text.toUpperCase()}</b> ${icon}`,
        SUBTITLE: (text) => `📌 <b>${text}</b>`,
        HIGHLIGHT: (text, icon = "🔸") => `${icon} ${text}`,
        LIST_ITEM: (text, level = 1) => {
            const indent = "   ".repeat(level);
            return `${indent}└─ ${text}`;
        },
        QUOTE: (text) => `▫️ <i>${text}</i>`,
        CARD: (title, content) => `
┏━━━━━━━━━━━━━━━━━━━━┓
┃  ${title}
┣━━━━━━━━━━━━━━━━━━━━┫
${content}
┗━━━━━━━━━━━━━━━━━━━━┛
        `.trim(),

        // Progress bar
        PROGRESS_BAR: (percentage, length = 10) => {
            const filled = Math.round((percentage / 100) * length);
            const empty = length - filled;
            return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage}%`;
        },

        // Table style
        TABLE_ROW: (label, value) => `• <b>${label}:</b> ${value}`,
        KEY_VALUE: (key, value) => `🔹 <b>${key}:</b> <code>${value}</code>`
    },

    // 🎭 Анимациялар
    ANIMATIONS: {
        LOADING_TEXTS: [
            "⚡ Юкланмоқда...",
            "🎯 Тайёрланмоқда...",
            "🔍 Текширилмоқда...",
            "📊 Маълумот олинмоқда...",
            "🔄 Жараён давом этаётди..."
        ]
    }
};

// ===== 🗂️ SESSION БОШҚАРУВИ =====
const sessions = new Map();

// Эски сессионларни тозалаш
setInterval(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    for (const [userId, data] of sessions) {
        if (now - data.timestamp > oneDay) {
            sessions.delete(userId);
            console.log(`${STYLES.ICONS.INFO} Сессия тозалади: ${userId}`);
        }
    }
}, 10 * 60 * 1000);

// ===== ⏰ LOADING AUTO-DELETE КОНФИГ =====
const LOADING_AUTO_DELETE_TIMEOUT = 1000; // 3 секунд - faqat loading хабарлари

// Loading хабарларни автожа ўчириш функцияси (фақат loading учун)
const scheduleLoadingAutoDelete = async (ctx, messageId) => {
    try {
        setTimeout(async () => {
            try {
                await ctx.deleteMessage(messageId);
                console.log(`${STYLES.ICONS.TRASH} Loading auto-deleted: ${messageId}`);
            } catch (err) {
                // Хабарни ўчиришда хатолик (аллақачон ўчирилган бўлиши)
                if (err.response && err.response.error_code !== 400) {
                    console.log(`${STYLES.ICONS.INFO} Loading message already deleted: ${messageId}`);
                }
            }
        }, LOADING_AUTO_DELETE_TIMEOUT);
    } catch (err) {
        console.error(`${STYLES.ICONS.ERROR} Loading auto-delete error:`, err.message);
    }
};

// ===== 🎨 STYLEЛИ ЁРДАМЧИ ФУНКСИЯЛАР =====
const getRandomLoadingText = () => {
    const texts = STYLES.ANIMATIONS.LOADING_TEXTS;
    return texts[Math.floor(Math.random() * texts.length)];
};

const sendLoading = async (ctx, customText = null) => {
    try {
        const text = customText || `${STYLES.ICONS.LOADING} ${getRandomLoadingText()}`;
        const msg = await ctx.reply(text, {
            parse_mode: "HTML",
            reply_markup: { remove_keyboard: true },
        });

        // Faqat loading хабарни auto-delete қилиш
        scheduleLoadingAutoDelete(ctx, msg.message_id);

        return msg.message_id;
    } catch (err) {
        console.error(`${STYLES.ICONS.ERROR} Loading хатоси:`, err.message);
        return null;
    }
};

const editOrReply = async (ctx, messageId, text, options = {}) => {
    try {
        const defaultOptions = {
            parse_mode: "HTML",
            ...options
        };

        if (messageId) {
            await ctx.telegram.editMessageText(
                ctx.chat.id,
                messageId,
                null,
                text,
                defaultOptions
            );
        } else {
            await ctx.reply(text, defaultOptions);
        }
    } catch (err) {
        try {
            await ctx.reply(text, {
                parse_mode: "HTML",
                ...options
            });
        } catch (e) {
            console.error(`${STYLES.ICONS.ERROR} Хабар юборишда хато:`, e.message);
        }
    }
};

// ===== 🎯 STYLEЛИ КЛАВИАТУРАЛАР =====
const createMainMenu = () => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(`${STYLES.ICONS.USER} Профилим`, "profile"),
            Markup.button.callback(`${STYLES.ICONS.EXIT} Чиқиш`, "logout")
        ],
        [
            Markup.button.callback(`${STYLES.ICONS.REFRESH} Янгилаш`, "refresh"),
            Markup.button.callback(`${STYLES.ICONS.HELP} Ёрдам`, "help")
        ],
        [
            // Markup.button.callback(`${STYLES.ICONS.ADMIN} Бошқарув панели`, "admin_panel"),
            Markup.button.callback(`${STYLES.ICONS.CHART} Статистика`, "stats")
        ]
    ]);
};

const createLoginMenu = () => {
    return Markup.inlineKeyboard([
        [
            Markup.button.callback(`${STYLES.ICONS.PHONE} Телефон рақам киритиш`, "enter_phone"),
        ]
    ]);
};

const createPhoneKeyboard = () => {
    return Markup.keyboard([
        Markup.button.contactRequest(`${STYLES.ICONS.PHONE} Телефон рақамни юбориш`)
    ])
        .oneTime()
        .resize();
};

const createBackButton = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback(`${STYLES.ICONS.HOME} Асосий менюга қайтиш`, "main_menu")]
    ]);
};

// ===== 📱 TELEFON ВАЛИДАЦИЯСИ =====
const isValidPhone = (phone) => {
    const cleaned = phone.replace(/\s/g, "");
    return /^\+998\d{9}$/.test(cleaned);
};

const formatPhone = (phone) => {
    const cleaned = phone.replace(/\s/g, "");
    if (cleaned.match(/^998/)) return `+${cleaned}`;
    if (cleaned.match(/^[0-9]{9}$/)) return `+998${cleaned}`;
    return cleaned;
};
bot.use((ctx, next) => {
    if (ctx.chat?.type !== 'private') {
        return
    }
    return next();
});

// ===== 🚀 /START КОМАНДАСИ =====
bot.start(async (ctx) => {
    const user = await Users.findOne({
        telegramId: String(ctx.from.id),
        isLoggedIn: true
    });

    if (user && user.role === "admin") {
        const welcomeText = `
${STYLES.HTML.TITLE("Хуш келибсиз", STYLES.ICONS.ROCKET)}

${STYLES.ICONS.STAR} <b>Ассалому алайкум, ${ctx.from.first_name || "Ҳурматли фойдаланувчи"}!</b>
${STYLES.ICONS.SUCCESS} <i>Сиз муваффақиятли тизимга кирдингиз!</i>

${STYLES.HTML.SUBTITLE("Меню имкониятлари")}
${STYLES.HTML.HIGHLIGHT("Профилим", STYLES.ICONS.USER)} - Шахсий маълумотларингиз
${STYLES.HTML.HIGHLIGHT("Янгилаш", STYLES.ICONS.REFRESH)} - Интерфейсни янгилаш
${STYLES.HTML.HIGHLIGHT("Ёрдам", STYLES.ICONS.HELP)} - Бот ҳақида маълумот
${STYLES.HTML.HIGHLIGHT("Чиқиш", STYLES.ICONS.EXIT)} - Аккаунтдан чиқиш

${STYLES.ICONS.FIRE} <b>Ҳаракатни бошланг!</b>
        `.trim();

        return ctx.reply(welcomeText, { parse_mode: "HTML", ...createMainMenu() });
    }

    const guestText = `
${STYLES.HTML.TITLE("Ассалому алайкум", STYLES.ICONS.WAVE)}

${STYLES.ICONS.USER} <b>Салом, ${ctx.from.first_name || "Меҳмон"}!</b>
${STYLES.ICONS.INFO} <i>Ботдан фойдаланиш учун тизимга киришингиз керак.</i>

${STYLES.HTML.SUBTITLE("Кириш усуллари")}
1. ${STYLES.HTML.HIGHLIGHT("/login", STYLES.ICONS.LOCK)} - Логин қилиш
2. ${STYLES.HTML.HIGHLIGHT("Телефон рақам", STYLES.ICONS.PHONE)} - Рақам орқали кириш

${STYLES.ICONS.LOCK} <b>Хавфсизлик учун фақат администраторлар кириши мумкин!</b>
        `.trim();

    await ctx.reply(guestText, { parse_mode: "HTML", ...createLoginMenu() });
});



// ===== 🔐 /LOGIN КОМАНДАСИ =====
bot.command("login", async (ctx) => {
    const user = await Users.findOne({
        telegramId: String(ctx.from.id),
        isLoggedIn: true
    });

    if (true) {
        return editOrReply(ctx, null,
            `${STYLES.ICONS.SUCCESS} <b>Сиз аллақачон тизимга киргансиз!</b>\n\n${STYLES.HTML.QUOTE("Профил маълумотларингизни кўриш учун /profile буюрғидан фойдаланинг")}`,
            { ...createMainMenu(), parse_mode: "HTML" }
        );
    }

    sessions.set(ctx.from.id, {
        step: "phone",
        timestamp: Date.now()
    });

    const loginText = `
${STYLES.HTML.TITLE("Логин қилиш", STYLES.ICONS.LOCK)}

${STYLES.HTML.SUBTITLE("Кириш босқичлари")}
1️⃣ ${STYLES.HTML.HIGHLIGHT("Телефон рақам", STYLES.ICONS.PHONE)} - Тизимда рўйхатдан ўтган рақамингизни киритинг
2️⃣ ${STYLES.HTML.HIGHLIGHT("Пароль", STYLES.ICONS.KEY)} - Шахсий паролингизни киритинг

${STYLES.HTML.SUBTITLE("Формат талаблари")}
📞 Телефон: ${STYLES.HTML.CODE("+998901234567")}
🔐 Пароль: ${STYLES.HTML.ITALIC("Шахсий паролингиз")}

${STYLES.ICONS.PHONE} <b>Телефон рақамингизни киритинг:</b>
    `.trim();

    await ctx.reply(loginText, { parse_mode: "HTML", ...createPhoneKeyboard() });
});

// ===== 📞 CONTACT ВА МАТН =====
bot.on("contact", async (ctx) => {
    const session = sessions.get(ctx.from.id);
    if (!session || session.step !== "phone") return;

    const phone = ctx.message.contact.phone_number.startsWith("+")
        ? ctx.message.contact.phone_number
        : "+" + ctx.message.contact.phone_number;

    await handlePhone(ctx, phone);
});

bot.on("text", async (ctx) => {
    const session = sessions.get(ctx.from.id);
    if (!session) return;

    const text = ctx.message.text.trim();

    if (session.step === "phone") {
        await handlePhone(ctx, text);
    } else if (session.step === "password") {
        await handlePassword(ctx, text);
    }
});

// ===== 📱 TELEFONНИ ҚАЙТА ИШЛАШ =====
async function handlePhone(ctx, phoneRaw) {
    const loadingId = await sendLoading(ctx, `${STYLES.ICONS.SEARCH} Телефон рақам текширилмоқда...`);

    const phone = formatPhone(phoneRaw);

    if (!isValidPhone(phone)) {
        return editOrReply(
            ctx,
            loadingId,
            `${STYLES.ICONS.ERROR} ${STYLES.HTML.SUBTITLE("Нотўғри формат!")}\n\n${STYLES.HTML.QUOTE("Илтимос, қуйидаги форматда киритинг:")}\n${STYLES.HTML.CODE("+998901234567")}\n\n${STYLES.ICONS.PHONE} <b>Қайта киритинг:</b>`,
            { reply_markup: createPhoneKeyboard().reply_markup, parse_mode: "HTML" }
        );
    }

    const user = await Users.findOne({ phoneNumber: phone });

    if (!user) {
        return editOrReply(
            ctx,
            loadingId,
            `${STYLES.ICONS.ERROR} ${STYLES.HTML.SUBTITLE("Рақам топилмади!")}\n\n${STYLES.HTML.QUOTE("Бу рақам тизимда рўйхатдан ўтмаган:")}\n${STYLES.HTML.CODE(phone)}\n\n${STYLES.ICONS.PHONE} <b>Бошқа рақам киритинг:</b>`,
            { reply_markup: createPhoneKeyboard().reply_markup, parse_mode: "HTML" }
        );
    }

    if (user.role !== "admin") {
        sessions.delete(ctx.from.id);
        return editOrReply(
            ctx,
            loadingId,
            `${STYLES.ICONS.WARNING} ${STYLES.HTML.SUBTITLE("Рухсат йўқ!")}\n\n${STYLES.HTML.QUOTE("Фақат администраторлар тизимга кириши мумкин.")}\n\n${STYLES.ICONS.INFO} <b>Бошқа ҳисоб билан уриниб кўринг:</b>`,
            { ...createLoginMenu(), parse_mode: "HTML" }
        );
    }

    sessions.set(ctx.from.id, {
        step: "password",
        user,
        timestamp: Date.now(),
    });

    await editOrReply(
        ctx,
        loadingId,
        `${STYLES.ICONS.CHECK} ${STYLES.HTML.SUBTITLE("Рақам тасдиқланди")}\n\n${STYLES.ICONS.USER} <b>Фойдаланувчи:</b> ${STYLES.HTML.BOLD(user.firstName)}\n${STYLES.ICONS.PHONE} <b>Телефон:</b> ${STYLES.HTML.CODE(phone)}\n\n${STYLES.ICONS.KEY} <b>Энди паролингизни киритинг:</b>`,
        { reply_markup: { remove_keyboard: true }, parse_mode: "HTML" }
    );
}

// ===== 🔑 PAROLНИ ҚАЙТА ИШЛАШ =====
async function handlePassword(ctx, password) {
    const session = sessions.get(ctx.from.id);
    if (!session || session.step !== "password") return;

    const loadingId = await sendLoading(ctx, `${STYLES.ICONS.LOCK} Пароль текширилмоқда...`);

    const isMatch = await bcrypt.compare(password, session.user.password);

    if (!isMatch) {
        return editOrReply(
            ctx,
            loadingId,
            `${STYLES.ICONS.ERROR} ${STYLES.HTML.SUBTITLE("Нотўғри пароль!")}\n\n${STYLES.HTML.QUOTE("Илтимос, тўғри паролни киритинг:")}`,
            { reply_markup: { remove_keyboard: true }, parse_mode: "HTML" }
        );
    }

    // Муваффақиятли логин
    await Users.updateOne(
        { _id: session.user._id },
        {
            $set: {
                telegramId: String(ctx.from.id),
                isLoggedIn: true,
                lastLogin: new Date(),
            },
        }
    );

    sessions.delete(ctx.from.id);

    const successText = `
${STYLES.HTML.TITLE("Табриклаймиз", STYLES.ICONS.STAR)}

${STYLES.ICONS.CHECK} <b>Сиз муваффақиятли тизимга кирдингиз!</b>

${STYLES.HTML.SUBTITLE("Шахсий маълумотлар")}
${STYLES.HTML.LIST_ITEM(`${STYLES.ICONS.USER} <b>Исм:</b> ${session.user.firstName}`)}
${STYLES.HTML.LIST_ITEM(`${STYLES.ICONS.ADMIN} <b>Рол:</b> Администратор`)}
${STYLES.HTML.LIST_ITEM(`${STYLES.ICONS.PHONE} <b>Телефон:</b> ${session.user.phoneNumber}`)}
${STYLES.HTML.LIST_ITEM(`${STYLES.ICONS.CALENDAR} <b>Саҳифа:</b> ${new Date().toLocaleDateString('uz-UZ')}`)}

${STYLES.ICONS.FIRE} <b>Энди ботнинг барча функциялари сиз учун очиқ!</b>
    `.trim();

    await editOrReply(ctx, loadingId, successText, { ...createMainMenu(), parse_mode: "HTML" });
}

// ===== 🎛️ INLINE ТУГМАЛАР =====
bot.action(/^(profile|logout|refresh|help|enter_phone|cancel_login|main_menu|admin_panel|stats)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const action = ctx.match[0];
    const userId = ctx.from.id;

    const user = await Users.findOne({
        telegramId: String(userId),
        isLoggedIn: true
    });

    switch (action) {
        case "profile":
            if (!user) {
                return editOrReply(ctx, null,
                    `${STYLES.ICONS.WARNING} ${STYLES.HTML.SUBTITLE("Кириш талаб қилинади!")}\n\n${STYLES.HTML.QUOTE("Профилни кўриш учун аввал тизимга киринг.")}`,
                    { ...createLoginMenu(), parse_mode: "HTML" }
                );
            }

            const profileText = `
${STYLES.HTML.TITLE("Профил маълумотлари", STYLES.ICONS.USER)}

${STYLES.HTML.SUBTITLE("Шахсий маълумотлар")}
${STYLES.HTML.TABLE_ROW("Телефон", STYLES.HTML.CODE(user.phoneNumber))}
${STYLES.HTML.TABLE_ROW("Исм", user.firstName)}
${STYLES.HTML.TABLE_ROW("Рол", user.role)}
${STYLES.HTML.TABLE_ROW("Ҳолат", user.isLoggedIn ? `${STYLES.ICONS.CHECK} Фаол` : `${STYLES.ICONS.CROSS} Нофаол`)}
${STYLES.HTML.TABLE_ROW("Охирги кириш", new Date(user.lastLogin || Date.now()).toLocaleString('uz-UZ'))}

${STYLES.ICONS.CLOCK} <i>Профил янгиланди:</i> <code>${new Date().toLocaleTimeString('uz-UZ')}</code>
            `.trim();

            await ctx.editMessageText(profileText, { parse_mode: "HTML", ...createMainMenu() });
            break;

        case "logout":
            if (!user) {
                return editOrReply(ctx, null,
                    `${STYLES.ICONS.INFO} ${STYLES.HTML.SUBTITLE("Сиз аллақачон чиқиб кетгансиз")}\n\n${STYLES.HTML.QUOTE("Яна кириш учун /login буюрғидан фойдаланинг")}`,
                    { ...createLoginMenu(), parse_mode: "HTML" }
                );
            }

            await Users.updateOne({ _id: user._id }, {
                $set: {
                    isLoggedIn: false,
                    lastLogout: new Date()
                }
            });

            await ctx.editMessageText(
                `${STYLES.ICONS.EXIT} ${STYLES.HTML.SUBTITLE("Муваффақиятли чиқдингиз!")}\n\n${STYLES.HTML.QUOTE("Хавфсизлик учун сессиянгиз ёпилди.")}\n\n${STYLES.ICONS.LOCK} <b>Қайта кириш учун:</b>\n${STYLES.HTML.HIGHLIGHT("/login", STYLES.ICONS.ARROW_RIGHT)}`,
                { parse_mode: "HTML", ...createLoginMenu() }
            );
            break;

        case "refresh":
            if (!user) {
                await ctx.answerCbQuery("❌ Аввал тизимга киринг!", { show_alert: true });
                return;
            }

            await ctx.answerCbQuery("✅ Янгиланди!", { show_alert: false });
            await ctx.editMessageText(
                `${STYLES.ICONS.REFRESH} ${STYLES.HTML.SUBTITLE("Меню янгиланди!")}\n\n${STYLES.HTML.QUOTE("Барча функциялар янгиланди ва тайёр.")}`,
                { parse_mode: "HTML", ...createMainMenu() }
            );
            break;

        case "help":
            const helpText = `
${STYLES.HTML.TITLE("Ёрдам ва қўлланма", STYLES.ICONS.HELP)}

${STYLES.HTML.SUBTITLE("Бот ҳақида")}
<i>Бу бот фақат администраторлар учун мўлжалланган махсус тизим ҳисобланади.</i>

${STYLES.HTML.SUBTITLE("Асосий буюрғалар")}
${STYLES.HTML.LIST_ITEM("<b>/start</b> - Асосий менюни очиш")}
${STYLES.HTML.LIST_ITEM("<b>/login</b> - Тизимга кириш")}
${STYLES.HTML.LIST_ITEM("<b>/profile</b> - Профил маълумотлари")}
${STYLES.HTML.LIST_ITEM("<b>/logout</b> - Тизимдан чиқиш")}

${STYLES.HTML.SUBTITLE("Техник қўллаб-қувватлаш")}
<i>Муаммо юзага келса, бош администратор билан боғланинг.</i>

${STYLES.ICONS.BELL} <i>Ёрдам керак бўлса, доим биз билан боғланинг!</i>\n
${STYLES.HTML.LINK("🛠️ Бот Админи", "https://t.me/+998956718883")}
            `.trim();

            await ctx.editMessageText(helpText, { parse_mode: "HTML", ...createMainMenu() });
            break;

        case "enter_phone":
            sessions.set(userId, {
                step: "phone",
                timestamp: Date.now()
            });

            await ctx.reply(
                `${STYLES.ICONS.PHONE} ${STYLES.HTML.SUBTITLE("Телефон рақамингизни киритинг")}\n\n${STYLES.HTML.QUOTE("Формат:")} ${STYLES.HTML.CODE("+998901234567")}`,
                { parse_mode: "HTML", ...createPhoneKeyboard() }
            );
            break;

        case "cancel_login":
            sessions.delete(userId);

            await ctx.editMessageText(
                `${STYLES.ICONS.CROSS} ${STYLES.HTML.SUBTITLE("Логин жараёни бекор қилинди")}\n\n${STYLES.HTML.QUOTE("Кейинроқ қайта уриниб кўринг.")}`,
                { parse_mode: "HTML", ...createLoginMenu() }
            );
            break;

        case "main_menu":
            if (!user) {
                return editOrReply(ctx, null,
                    `${STYLES.ICONS.WARNING} ${STYLES.HTML.SUBTITLE("Асосий менюга кириш учун логин қилишингиз керак!")}`,
                    { parse_mode: "HTML", ...createLoginMenu() }
                );
            }

            await ctx.editMessageText(
                `${STYLES.ICONS.HOME} ${STYLES.HTML.SUBTITLE("Асосий менюга хуш келибсиз!")}\n\n${STYLES.HTML.QUOTE("Керакли амални танланг:")}`,
                { parse_mode: "HTML", ...createMainMenu() }
            );
            break;

        case "admin_panel":
            if (!user) {
                await ctx.answerCbQuery("❌ Рухсат йўқ!", { show_alert: true });
                return;
            }

            await ctx.editMessageText(
                `${STYLES.ICONS.ADMIN} ${STYLES.HTML.SUBTITLE("Бошқарув панели")}\n\n${STYLES.HTML.QUOTE("Бу қисм ҳозирча ишга туширилмаган.")}\n\n${STYLES.ICONS.GEAR} <b>Яқин орада янгиликлар кутилмоқда...</b>`,
                { parse_mode: "HTML", ...createBackButton() }
            );
            break;

        case "stats":
            if (!user) {
                await ctx.answerCbQuery("❌ Статистика учун кириш керак!", { show_alert: true });
                return;
            }

            const totalUsers = await Users.countDocuments();
            const activeAdmins = await Users.countDocuments({
                isLoggedIn: true,
                role: "admin"
            });

            const adminUsers = await Users.countDocuments({ role: "admin" });

            const statsText = `
${STYLES.HTML.CARD("📊 СТАТИСТИКА", `
${STYLES.HTML.KEY_VALUE("Жами администраторлар", adminUsers.toString())}
${STYLES.HTML.KEY_VALUE("Фаол администраторлар", `${activeAdmins} (${Math.round((activeAdmins / adminUsers) * 100)}%)`)}
${STYLES.HTML.KEY_VALUE("Ўртача фаоллик", STYLES.HTML.PROGRESS_BAR(Math.round((activeAdmins / adminUsers) * 100)))}
`)}

${STYLES.ICONS.DATABASE} <i>Маълумотлар базаси ҳолати:</i> <b>Яхши</b>
${STYLES.ICONS.SHIELD_CHECK} <i>Хавфсизлик даражаси:</i> <b>Юқори</b>
${STYLES.ICONS.CLOCK} <i>Статистика янгиланди:</i> <code>${new Date().toLocaleTimeString('uz-UZ')}</code>
            `.trim();

            await ctx.editMessageText(statsText, { parse_mode: "HTML", ...createBackButton() });
            break;
    }
});

// ===== 📋 ҚЎШИМЧА КОМАНДАЛАР =====
bot.command("profile", async (ctx) => {
    const user = await Users.findOne({
        telegramId: String(ctx.from.id),
        isLoggedIn: true
    });

    if (!user) {
        return editOrReply(ctx, null,
            `${STYLES.ICONS.WARNING} ${STYLES.HTML.SUBTITLE("Профилни кўриш учун кириш талаб қилинади!")}\n\n${STYLES.HTML.QUOTE("Аввал тизимга киринг:")}\n${STYLES.HTML.HIGHLIGHT("/login", STYLES.ICONS.ARROW_RIGHT)}`,
            { parse_mode: "HTML", ...createLoginMenu() }
        );
    }

    const profileText = `
${STYLES.HTML.TITLE("Сизнинг профилингиз", STYLES.ICONS.USER)}

${STYLES.HTML.CARD("АСОСИЙ МАЪЛУМОТЛАР", `
${STYLES.HTML.KEY_VALUE("Телефон рақам", user.phoneNumber)}
${STYLES.HTML.KEY_VALUE("Тўлиқ исм", `${user.firstName} ${user.lastName || ''}`)}
${STYLES.HTML.KEY_VALUE("Лавозим", user.role)}
${STYLES.HTML.KEY_VALUE("Фаоллик ҳолати", user.isLoggedIn ? `${STYLES.ICONS.CHECK} Онлайн` : `${STYLES.ICONS.CROSS} Офлайн`)}
${STYLES.HTML.KEY_VALUE("Рўйхатдан ўтган", new Date(user.createdAt || Date.now()).toLocaleDateString('uz-UZ'))}
`)}

${STYLES.ICONS.SHIELD} <i>Барча маълумотлар хавфсиз сақланади</i>
    `.trim();

    await ctx.reply(profileText, { parse_mode: "HTML", ...createMainMenu() });
});

bot.command("logout", async (ctx) => {
    const updated = await Users.updateOne(
        { telegramId: String(ctx.from.id), isLoggedIn: true },
        {
            $set: {
                isLoggedIn: false,
                lastLogout: new Date()
            }
        }
    );

    if (updated.modifiedCount === 0) {
        return editOrReply(ctx, null,
            `${STYLES.ICONS.INFO} ${STYLES.HTML.SUBTITLE("Сиз ҳозир тизимга кирмагансиз")}\n\n${STYLES.HTML.QUOTE("Аввал тизимга киришингиз керак эди.")}`,
            { parse_mode: "HTML", ...createLoginMenu() }
        );
    }

    sessions.delete(ctx.from.id);

    await ctx.reply(
        `${STYLES.ICONS.EXIT} ${STYLES.HTML.SUBTITLE("Тизимдан муваффақиятли чиқдингиз!")}\n\n${STYLES.HTML.QUOTE("Сессия ёпилди ва барча маълумотлар хавфсиз сақланди.")}\n\n${STYLES.ICONS.LOCK} <b>Қайта кириш учун:</b>\n${STYLES.HTML.HIGHLIGHT("/login", STYLES.ICONS.ARROW_RIGHT)}`,
        { parse_mode: "HTML", ...createLoginMenu() }
    );
});

// ===== ⚠️ ХАТОЛИКЛАРНИ БОШҚАРИШ =====
bot.catch((err, ctx) => {
    console.error(`${STYLES.ICONS.ERROR} Бот хатоси:`, err);

    const errorText = `
${STYLES.HTML.TITLE("Техник хато", STYLES.ICONS.ERROR)}

${STYLES.HTML.QUOTE("Илтимос, бироздан сўнг қайта уриниб кўринг.")}

${STYLES.HTML.SUBTITLE("Агар муаммо такрорланса:")}
${STYLES.HTML.LIST_ITEM("<b>/start</b> - Ботни қайта ишга туширинг")}
${STYLES.HTML.LIST_ITEM("<b>/refresh</b> - Интерфейсни янгиланг")}
${STYLES.HTML.LIST_ITEM("Администратор билан боғланинг")}

${STYLES.ICONS.INFO} <i>Хато ҳақида маълумот ёзиб олинди.</i>
    `.trim();

    try {
        ctx.reply(errorText, { parse_mode: "HTML" });
    } catch (e) {
        console.error(`${STYLES.ICONS.ERROR} Хато ҳақида хабар беришда хато:`, e);
    }
});

// ===== 🚀 ИШГА ТУШИРИШ =====
console.log(`${STYLES.ICONS.ROCKET} Бот ишга туширилмоқда...`);

bot.launch()
    .then(() => {
        console.log(`${STYLES.ICONS.SUCCESS} Бот муваффақиятли ишга тушди!`);
        console.log(`${STYLES.ICONS.USER} Бот username: @${bot.botInfo.username}`);

        const startTime = new Date().toLocaleTimeString('uz-UZ');
        console.log(`${STYLES.ICONS.CALENDAR} Иш вақти: ${startTime}`);
        console.log(`${STYLES.ICONS.INFO} Сессионлар: ${sessions.size} та`);
        console.log(`${STYLES.ICONS.HOURGLASS} Loading auto-delete актив: ${LOADING_AUTO_DELETE_TIMEOUT}ms`);
    })
    .catch((err) => {
        console.error(`${STYLES.ICONS.ERROR} Ботни ишга туширишда хато:`, err);
    });

// ===== 🔄 GRACEFUL STOP =====
process.once("SIGINT", () => {
    console.log(`\n${STYLES.ICONS.INFO} Бот тўхтатилмоқда...`);
    sessions.clear();
    bot.stop("SIGINT");
    console.log(`${STYLES.ICONS.SUCCESS} Бот тўхтатилди!`);
});

process.once("SIGTERM", () => {
    console.log(`\n${STYLES.ICONS.INFO} Бот тўхтатилмоқда...`);
    sessions.clear();
    bot.stop("SIGTERM");
    console.log(`${STYLES.ICONS.SUCCESS} Бот тўхтатилди!`);
});