import rateLimit from "express-rate-limit";

export const apilimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 70,
    message: "Жуда кўп сўров!",
});

