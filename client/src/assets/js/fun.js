let moodIndex = 0;

export function emojiRain() {
    const moods = [
        ["vebox.uz"]
    ];

    const emojis = moods[moodIndex];

    for (let i = 0; i < 35; i++) {
        const span = document.createElement("span");
        span.innerText = emojis[Math.floor(Math.random() * emojis.length)];

        const startX = Math.random() * window.innerWidth;
        const startY = Math.random() * -200;
        const driftX = (Math.random() - 0.5) * 200;
        const duration = 2000 + Math.random() * 2500;
        const size = 18 + Math.random() * 32;

        span.style.position = "fixed";
        span.style.left = startX + "px";
        span.style.top = startY + "px";
        span.style.fontSize = size + "px";
        span.style.pointerEvents = "none";
        span.style.zIndex = 9999;
        span.style.willChange = "transform, opacity";
        span.style.transition = `transform ${duration}ms linear, opacity ${duration}ms`;

        document.body.appendChild(span);

        requestAnimationFrame(() => {
            span.style.transform = `translate(${driftX}px, ${window.innerHeight + 300}px)`;
            span.style.opacity = "0";
        });

        setTimeout(() => span.remove(), duration);
    }
}
