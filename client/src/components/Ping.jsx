import { WifiOff, Wifi } from 'lucide-react'
import Fetch from '../middlewares/fetcher'
import { useState, useEffect } from 'react'
import { useContext } from 'react'
import { ContextData } from '../contextData/Context'

export const Ping = () => {
  const { dark, setPingms } = useContext(ContextData)
  const [isOffline, setIsOffline] = useState(false)
  const [showFullModal, setShowFullModal] = useState(false)
  const [pingStatus, setPingStatus] = useState('online')

  const checkConnection = async () => {
    if (!navigator.onLine) {
      setIsOffline(true)
      setPingStatus('offline')
      return
    }

    const start = performance.now()
    try {
      await Fetch.get('/status')
      const end = performance.now()
      const latency = Number((end - start).toFixed())
      setPingms(latency)

      if (latency > 5000) {
        setIsOffline(true)
        setPingStatus('slow')
      } else if (latency > 1050) {
        setPingStatus('slow')
        setIsOffline(false)
      } else {
        setPingStatus('online')
        setIsOffline(false)
      }
    } catch {
      setIsOffline(true)
      setPingStatus('offline')
    }
  }

  useEffect(() => {
    checkConnection()
    const interval = setInterval(checkConnection, 10000)
    const handleOnline = () => {
      setIsOffline(false)
      setPingStatus('online')
    }
    const handleOffline = () => {
      setIsOffline(true)
      setPingStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleRetry = () => {
    window.location.reload()
  }

  const getStatusColor = () => {
    switch (pingStatus) {
      case 'online': return '#10b981' // Green
      case 'slow': return '#f59e0b' // Amber
      case 'offline': return '#ef4444' // Red
    }
  }

  const getStatusText = () => {
    switch (pingStatus) {
      case 'online': return 'Онлайн'
      case 'slow': return 'Низкая скорость'
      case 'offline': return 'Оффлайн'
    }
  }

  return (
    <>
      {/* Small status indicator */}
      {pingStatus !== 'online' && (
        <div
          className={`fixed top-4 right-4 z-[9998] cursor-pointer transition-all duration-300
            ${showFullModal ? 'scale-0' : 'scale-100'}
          `}
          onClick={() => setShowFullModal(true)}
        >
          <div className={`
            flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg backdrop-blur-sm
            ${dark
              ? 'bg-gray-800/90 text-gray-200 border border-gray-700'
              : 'bg-white/90 text-gray-800 border border-gray-200'
            }
          `}>
            {pingStatus === 'offline' ? (
              <WifiOff size={16} color={getStatusColor()} />
            ) : (
              <Wifi size={16} color={getStatusColor()} />
            )}
            <span className="text-sm font-medium">{getStatusText()}</span>
          </div>
        </div>
      )}

      {/* Full modal */}
      {showFullModal && (
        <div
          className={`fixed inset-0 flex items-center justify-center z-[9999] transition-all duration-300
            ${dark ? 'bg-black/50' : 'bg-black/40'} backdrop-blur-sm
          `}
          onClick={() => setShowFullModal(false)}
        >
          <div
            className={`p-6 rounded-xl shadow-2xl flex flex-col items-center gap-4 max-w-xs w-full mx-4
              ${dark ? 'bg-gray-900 text-gray-200' : 'bg-white text-gray-800'}
              animate-scale-in
            `}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative">
              {pingStatus === 'offline' ? (
                <WifiOff size={48} color="#ef4444" className="animate-pulse" />
              ) : (
                <Wifi size={48} color="#f59e0b" />
              )}
              {pingStatus === 'slow' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full animate-ping" />
              )}
            </div>

            <h2 className={`text-xl font-bold ${pingStatus === 'offline' ? 'text-red-500' :
              pingStatus === 'slow' ? 'text-amber-500' :
                'text-green-500'
              }`}>
              {pingStatus === 'offline'
                ? 'Интернет уланмаган!'
                : 'Низкая скорость интернета'
              }
            </h2>

            <p className={`text-center text-sm ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
              {pingStatus === 'offline'
                ? 'Интернетга уланишингиз узилди. Илтимос, тармоқни текширинг.'
                : 'Интернет алокаси суст. Маълумотлар юкланиши бироз вақт олиши мумкин.'
              }
            </p>

            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={() => setShowFullModal(false)}
                className={`flex-1 py-2 rounded-lg transition-colors duration-300 font-medium text-sm
                  ${dark
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                Тушунарли
              </button>
              {pingStatus === 'offline' && (
                <button
                  onClick={handleRetry}
                  className={`flex-1 py-2 rounded-lg transition-colors duration-300 font-medium text-sm
                    ${dark
                      ? 'bg-red-900/30 text-red-400 hover:bg-red-800/40 border border-red-800'
                      : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                    }
                  `}
                >
                  Қайта уриниш
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

