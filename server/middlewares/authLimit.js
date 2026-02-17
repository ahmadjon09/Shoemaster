import rateLimit from "express-rate-limit";

export const authlimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 5,
    message: "Жуда кўп сўров!",
});

