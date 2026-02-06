import os from 'os'
import si from 'systeminformation' 

export const getSystemHealth = async (_, res) => {
  try {
    const [
      cpu,
      mem,
      osInfo,
      disk,
      graphics,
      network,
      processes,
      currentLoad
    ] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.osInfo(),
      si.diskLayout(),
      si.graphics(),
      si.networkInterfaces(),
      si.processes(),
      si.currentLoad()
    ])

    const data = {
      system: {
        platform: os.platform(),
        release: os.release(),
        hostname: os.hostname(),
        uptime: `${Math.floor(os.uptime() / 3600)}h ${Math.floor(
          (os.uptime() % 3600) / 60
        )}m`,
        architecture: os.arch()
      },
      cpu: {
        manufacturer: cpu.manufacturer,
        brand: cpu.brand,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed + 'GHz',
        load: currentLoad.currentLoad.toFixed(2) + '%'
      },
      memory: {
        total: (mem.total / 1024 ** 3).toFixed(2) + ' GB',
        used: (mem.active / 1024 ** 3).toFixed(2) + ' GB',
        free: (mem.free / 1024 ** 3).toFixed(2) + ' GB',
        usage: ((mem.active / mem.total) * 100).toFixed(2) + '%'
      },
      gpu: graphics.controllers.map(gpu => ({
        model: gpu.model,
        vendor: gpu.vendor,
        vram: gpu.vram + ' MB',
        bus: gpu.bus
      })),
      storage: disk.map(d => ({
        device: d.device,
        type: d.type,
        name: d.name,
        size: (d.size / 1024 ** 3).toFixed(2) + ' GB',
        interfaceType: d.interfaceType
      })),
      network: network.map(n => ({
        iface: n.iface,
        ip4: n.ip4,
        mac: n.mac,
        speed: n.speed + ' Mbps',
        internal: n.internal
      })),
      processes: {
        all: processes.all,
        running: processes.running,
        blocked: processes.blocked
      },
      timestamp: new Date()
    }

    res.status(200).json(data)
  } catch (err) {
    console.error('Health check error:', err)
    res.status(500).json({ error: 'Failed to retrieve system health info' })
  }
}
