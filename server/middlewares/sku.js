export function generateSKU() {
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const randomLetter1 = letters[Math.floor(Math.random() * letters.length)];
    const randomLetter2 = letters[Math.floor(Math.random() * letters.length)];
    const randomNumber = Math.floor(100000 + Math.random() * 900000);

    return `${randomLetter1}${randomNumber}${randomLetter2}`;
}
