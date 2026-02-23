import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import axios from 'axios'
import ProductRoutes from './routes/product.js'
import StatsRoutes from './routes/stats.js'
import OrderRoutes from './routes/order.js'
import ClientRoutes from './routes/client.js'
import path from 'path'
import UserRoutes from './routes/user.js'
import dotenv from 'dotenv'
import { getSystemHealth } from './controllers/health.js'
import os from "os"
import isExisted from './middlewares/isExisted.js'
import IsAdmin from './middlewares/IsAdmin.js'
import { fileURLToPath } from 'url'
import { apilimiter } from './middlewares/apiLimit.js'
// import { authlimiter } from './middlewares/authLimit.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config()
const getLocalIP = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
};
const app = express()
app.use(cors())
app.use(express.json())





app.use('/v1', apilimiter)
app.get('/v1/', (_, res) => res.send('Server is running!'))

app.get('/v1/status', (_, res) => {
  setImmediate(() => {
    res.json({
      status: 'working',
      port: process.env.PORT || 8799,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    })
  })
})
app.use('/v1/users', UserRoutes)
app.use('/v1/stats', isExisted, IsAdmin, StatsRoutes)
app.use('/v1/products', ProductRoutes)
app.use('/v1/orders', OrderRoutes)
app.use('/v1/clients', ClientRoutes)
app.use('/v1/health', getSystemHealth)
app.get('/v1/system', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'health.html'))
})
app.get('/v1/about', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.use((req, res) => {
  if (req.path.startsWith("/v1")) {
    return res.status(404).json({ message: "Route not found" });
  }

  res.sendFile(path.join(__dirname, 'public', '404.html'))
});

const keepServerAlive = () => {
  const pingInterval = 12 * 60 * 1000;

  const checkAndPing = () => {
    const now = new Date();
    const hourTashkent = (now.getUTCHours() + 5) % 24;

    if (hourTashkent >= 8 || hourTashkent < 1) {
      axios
        .get(process.env.RENDER_URL)
        .then(() => console.log('🔄 Server active (Tashkent time)'))
        .catch(() => console.log('⚠️ Ping failed'))
    } else {
      console.log('💤 Keep-alive uyqu rejimida (Tashkent time)')
    }
  }

  checkAndPing();
  setInterval(checkAndPing, pingInterval);
}

keepServerAlive();


const startApp = async () => {
  const PORT = process.env.PORT || 3000
  const HOST = "0.0.0.0"
  try {
    await mongoose.connect(process.env.MONGODB_URL)
    console.log('✔️  MongoDB connected')
    app.listen(PORT, HOST, () => {
      const ip = getLocalIP();
      console.log("================================");
      console.log("🚀 Server ishga tushdi");
      console.log(`🌐 Localhost: http://localhost:${PORT}`);
      console.log(`📱 IP orqali: http://${ip}:${PORT}`);
      console.log("================================");
    })
  } catch (error) {
    console.log(error)
  }
}

startApp()
