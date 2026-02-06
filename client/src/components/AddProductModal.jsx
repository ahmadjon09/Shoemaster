import {
  X,
  Loader2,
  Trash2,
  CheckCircle,
  Plus,
  Package,
  DollarSign,
  Upload,
  Image as ImageIcon,
  Scissors,
  Eye,
  IdCard,
  Camera,
  QrCode,
  Box,
  Maximize2,
  Minimize2,
  AlertCircle,
  Flashlight,
  FlashlightOff,
  Captions
} from 'lucide-react'
import { useState, useContext, useEffect, useRef, useCallback } from 'react'
import Fetch from '../middlewares/fetcher'
import { ContextData } from '../contextData/Context'
import { motion, AnimatePresence } from 'framer-motion'
import jsQR from 'jsqr'
import { scanned } from '../assets/js/saund'
import { api } from '../assets/js/i'

export default function AddProductModal({ open, setOpen, mutate }) {
  const { user, dark } = useContext(ContextData)

  const [productData, setProductData] = useState({
    title: '',
    sku: '',
    price: '',
    category: 'Ёзги',
    gender: 'men',
    season: 'all',
    material: 'Unknown',
    count: 0,
    mainImages: []
  })

  const [mainImages, setMainImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [error, setError] = useState('')
  const [selectedImages, setSelectedImages] = useState({})
  const [showImagePreview, setShowImagePreview] = useState(null)
  const [flashlightOn, setFlashlightOn] = useState(false)

  // QR Scanner states
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState('')
  const [scanError, setScanError] = useState('')
  const [cameraFullscreen, setCameraFullscreen] = useState(false)

  // АРТ check states
  const [checkingSku, setCheckingSku] = useState(false)
  const [skuStatus, setSkuStatus] = useState(null) // null, 'exists', 'not_found'
  const [existingProduct, setExistingProduct] = useState(null)

  const mainImagesInputRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const scannerContainerRef = useRef(null)
  const rafRef = useRef(null)
  const scannedRef = useRef(false)
  const streamRef = useRef(null);

  // Tarjimalar
  const categories = [
    { value: 'Ёзги', label: 'Ёзги' },
    { value: 'Баҳор-кузги', label: 'Баҳор-кузги' },
    { value: 'Қишги', label: 'Қишги' },
  ]


  // АРТ ni tekshirish
  const checkSku = async (sku) => {
    if (!sku.trim()) {
      setSkuStatus(null)
      setExistingProduct(null)
      return
    }

    try {
      setCheckingSku(true)
      const response = await Fetch.get(`/products/check?sku=${encodeURIComponent(sku)}`)

      if (response.data.product) {
        setSkuStatus('exists')
        setExistingProduct(response.data.product)

        // Автомат заполнение полей из существующего продукта
        setProductData(prev => ({
          ...prev,
          title: response.data.product.title,
          category: response.data.product.category,
          gender: response.data.product.gender,
          season: response.data.product.season,
          material: response.data.product.material,
          mainImages: response.data.product.mainImages || []
        }))

        if (response.data.product.mainImages?.length > 0) {
          setMainImages(response.data.product.mainImages)
        }
      } else {
        setSkuStatus('not_found')
        setExistingProduct(null)
      }
    } catch (error) {
      console.error('АРТ check error:', error)
      setSkuStatus('error')
      setExistingProduct(null)
    } finally {
      setCheckingSku(false)
    }
  }

  // АРТ input'ni o'zgartirganda tekshirish
  useEffect(() => {
    if (productData.sku && productData.sku.trim().length >= 3) {
      const timer = setTimeout(() => {
        checkSku(productData.sku)
      }, 500)

      return () => clearTimeout(timer)
    } else {
      setSkuStatus(null)
      setExistingProduct(null)
    }
  }, [productData.sku])

  // Scanner functions
  const startScan = async () => {
    scannedRef.current = false;
    stopScan()
    try {
      setScanError('')
      setScanResult('')
      setCameraFullscreen(false)

      scannedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
      })
      streamRef.current = stream;
      videoRef.current.srcObject = stream
      videoRef.current.setAttribute('playsinline', true)
      await videoRef.current.play()

      setScanning(true)
      scanLoop()

    } catch (err) {
      console.error('Camera error:', err)
      setScanError('Камера очилмади. Илтимос, рухсат беринг.')
    }
  }

  const stopScan = () => {
    setScanning(false)
    scannedRef.current = false; // 🔥 MUHIM

    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop())
      videoRef.current.srcObject = null
    }

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  const toggleFlashlight = useCallback(async () => {
    if (!streamRef.current) return

    try {
      const videoTrack = streamRef.current.getVideoTracks()[0]
      if (videoTrack && 'applyConstraints' in videoTrack) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !flashlightOn }]
        })
        setFlashlightOn(!flashlightOn)
      }
    } catch (err) {
      console.error('Flashlight error:', err)
      setMessage({
        type: 'error',
        text: 'Фонарик қўллаб-қувватланмайди'
      })
    }
  }, [flashlightOn])

  const scanLoop = () => {
    if (scannedRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.videoWidth === 0) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    // 🔥 KAMERA RESOLUTION
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // 🔥 ZOOM PARAMETR
    const zoom = 1.6; // 1.3–2.0 oralig‘ida o‘ynab ko‘r
    const sw = canvas.width / zoom;
    const sh = canvas.height / zoom;
    const sx = (canvas.width - sw) / 2;
    const sy = (canvas.height - sh) / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 🔥 CENTER CROP + ZOOM
    ctx.drawImage(
      video,
      sx, sy, sw, sh,
      0, 0, canvas.width, canvas.height
    );

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      const code = jsQR(
        imageData.data,
        imageData.width,
        imageData.height,
        {
          inversionAttempts: "attemptBoth" // 🔥 ENG MUHIM
        }
      );

      if (code?.data) {
        scannedRef.current = true;

        const scanSound = new Audio(`data:audio/wav;base64,${scanned}`);
        scanSound.volume = 1;
        scanSound.play().catch(() => { });

        setScanResult(code.data);
        setProductData(prev => ({ ...prev, sku: code.data }));

        setTimeout(() => {
          stopScan();
          setShowScanner(false);
        }, 400);

        return;
      }
    } catch (err) {
      console.error("QR scan error:", err);
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  };



  // Camera to'liq ekran rejimi
  const toggleCameraFullscreen = () => {
    if (!scannerContainerRef.current) return

    if (!cameraFullscreen) {
      if (scannerContainerRef.current.requestFullscreen) {
        scannerContainerRef.current.requestFullscreen()
      } else if (scannerContainerRef.current.webkitRequestFullscreen) {
        scannerContainerRef.current.webkitRequestFullscreen()
      } else if (scannerContainerRef.current.mozRequestFullScreen) {
        scannerContainerRef.current.mozRequestFullScreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen()
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen()
      }
    }
    setCameraFullscreen(!cameraFullscreen)
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setCameraFullscreen(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement
      )
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // useEffect(() => {
  //   if (!open) return

  //   setShowScanner(true)
  //   setScanning(true)
  //   startScan()

  //   return () => {
  //     stopScan?.()
  //   }
  // }, [open])


  // 🔄 Asosiy maydonlarni o'zgartirish
  const handleChange = (field, value) => {
    if (field === 'price') {
      const filtered = value.replace(/[^\d]/g, '')
      setProductData(prev => ({
        ...prev,
        [field]: filtered
      }))
    } else if (field === 'count') {
      const numValue = Math.max(0, parseInt(value) || 0)
      setProductData(prev => ({
        ...prev,
        [field]: numValue
      }))
    } else if (field === 'sku') {
      setProductData(prev => ({
        ...prev,
        [field]: value
      }))
      if (existingProduct && value !== existingProduct.sku) {
        setExistingProduct(null)
        setSkuStatus(null)
      }
    } else {
      setProductData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  // 📸 Rasm yuklash funksiyasi
  const uploadImage = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${api}`,
        {
          method: 'POST',
          body: formData
        }
      );

      const data = await response.json();

      if (data && data.data && data.data.url) {
        return data.data.url;
      }

      throw new Error('Rasm yuklashda xatolik');
    } catch (error) {
      console.error('Rasm yuklashda xatolik:', error);
      throw error;
    }
  };

  // 📸 Asosiy rasmlarni yuklash
  const handleMainImagesUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    try {
      setImageUploading(true)
      const uploadedUrls = []

      for (const file of files) {
        try {
          const url = await uploadImage(file)
          uploadedUrls.push(url)
        } catch (error) {
          console.error(`Rasm yuklashda xatolik (${file.name}):`, error)
          alert(`"${file.name}" расмини юклашда хатолик`)
        }
      }

      if (uploadedUrls.length > 0) {
        setMainImages(prev => [...prev, ...uploadedUrls])
        setProductData(prev => ({
          ...prev,
          mainImages: [...prev.mainImages, ...uploadedUrls]
        }))
      }
    } catch (error) {
      console.error('Umumiy rasm yuklashda xatolik:', error)
      setError('❌ Расм юклашда хатолик!')
    } finally {
      setImageUploading(false)
      if (mainImagesInputRef.current) {
        mainImagesInputRef.current.value = ''
      }
    }
  }

  // 🗑️ Asosiy rasmni o'chirish
  const removeMainImage = (imageIndex) => {
    setMainImages(prev => prev.filter((_, i) => i !== imageIndex))
    setProductData(prev => ({
      ...prev,
      mainImages: prev.mainImages.filter((_, i) => i !== imageIndex)
    }))
  }

  // ✅ Form validation
  const validateForm = () => {
    if (!productData.title.trim()) {
      alert('❌ Маҳсулот номини киритинг')
      return false
    }

    if (productData.count < 0) {
      alert('❌ Дона сонини тўғри киритинг')
      return false
    }

    // Agar АРТ mavjud bo'lsa, count majburiy
    if (skuStatus === 'exists' && productData.count <= 0) {
      alert('❌ Дона сонини киритинг (маҳсулот омборда мавжуд)')
      return false
    }

    return true
  }

  // 💾 Formani yuborish
  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      let payload;

      // Agar product allaqachon mavjud bo'lsa, faqat count ni o'zgartirish
      if (skuStatus === 'exists' && existingProduct) {
        // Faqat count ni yangilash
        const newCount = (existingProduct.count || 0) + Number(productData.count)

        payload = {
          count: newCount
        }

        // PUT request bilan yangilash
        const response = await Fetch.put(`/products/${existingProduct._id}`, payload)

        if (response.data) {
          mutate()
          resetForm()
          setOpen(false)
        }
      } else {
        // Yangi product yaratish
        payload = {
          title: productData.title,
          sku: productData.sku,
          category: productData.category,
          gender: productData.gender,
          season: productData.season,
          material: productData.material,
          count: Number(productData.count),
          mainImages: productData.mainImages
        }

        const response = await Fetch.post('/products/create', payload)

        if (response.data.product) {
          mutate()
          resetForm()
          setOpen(false)
        }
      }
    } catch (err) {
      console.error('Xatolik:', err)
      const errorMsg = err.response?.data?.message ||
        err.message ||
        '❌ Маҳсулот қўшишда хатолик юз берди'
      setError(errorMsg)
      alert(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  // 🔄 Formani tozalash
  const resetForm = () => {
    setProductData({
      title: '',
      sku: '',
      price: '',
      category: 'shoes',
      gender: 'men',
      season: 'all',
      material: 'Unknown',
      count: 0,
      mainImages: []
    })
    setMainImages([])
    setSelectedImages({})
    setError('')
    setShowScanner(false)
    setCameraFullscreen(false)
    setSkuStatus(null)
    setExistingProduct(null)
    stopScan()
  }

  // Dark mode styles
  const modalBg = dark ? 'bg-gray-900' : 'bg-white'
  const textColor = dark ? 'text-white' : 'text-gray-800'
  const textMuted = dark ? 'text-gray-300' : 'text-gray-600'
  const borderColor = dark ? 'border-gray-700' : 'border-gray-200'
  const inputBg = dark ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
  const cardBg = dark ? 'bg-gray-800/50 border-gray-700' : 'bg-gradient-to-br from-gray-50 to-white border-gray-200'

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed top-0 h-screen inset-0 bg-black/60 backdrop-blur-sm z-[99]'
            onClick={() => setOpen(false)}
          />

          {/* Modal */}
          <div className='fixed inset-0 flex items-center justify-center z-[100] px-3 sm:px-6 py-6'>
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={`${modalBg} w-full max-w-4xl rounded-3xl shadow-2xl p-6 sm:p-8 space-y-8 relative max-h-[95vh] overflow-y-auto ${borderColor} border`}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b ${borderColor}`}>
                <div className='flex items-center gap-4'>
                  <div className='p-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg'>
                    <Plus className='h-7 w-7 text-white' />
                  </div>
                  <div>
                    <h2 className={`text-2xl sm:text-3xl font-bold ${textColor}`}>
                      Янги маҳсулот қўшиш
                    </h2>
                    <p className={`text-sm ${textMuted} mt-2`}>
                      {skuStatus === 'exists' ? 'Маҳсулот омборда мавжуд. Фақат дона сонини қўшинг.' : 'Янги маҳсулот маълумотлари'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setOpen(false)}
                  className={`p-2 rounded-xl transition-colors ${dark ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-500'}`}
                >
                  <X size={24} />
                </button>
              </div>



              {skuStatus === 'exists' && existingProduct && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl ${dark ? 'bg-green-900/30 border-green-700' : 'bg-green-50 border-green-200'} border`}
                >
                  <div className='flex items-start gap-3'>
                    <AlertCircle className='h-5 w-5 text-green-500 mt-0.5' />
                    <div className='flex-1'>
                      <p className='font-semibold text-green-600 dark:text-green-400 mb-2'>
                        ✅ Бу АРТ билан маҳсулот омборда мавжуд
                      </p>
                      <div className='grid grid-cols-1 gap-2 md:grid-cols-2 text-sm'>
                        <div>
                          <span className='text-gray-600 dark:text-gray-400'>Номи:</span>
                          <span className='font-medium ml-2'>{existingProduct.title}</span>
                        </div>
                        <div>
                          <span className='text-gray-600 dark:text-gray-400'>Ҳозирги дона:</span>
                          <span className='font-medium ml-2'>{existingProduct.count || 0} дона</span>
                        </div>
                        <div>
                          <span className='text-gray-600 dark:text-gray-400'>Категория:</span>
                          <span className='font-medium ml-2'>{existingProduct.category}</span>
                        </div>
                      </div>
                      <p className='text-sm text-green-600 dark:text-green-400 mt-2'>
                        Фақат қўшимча дона сонини киритинг. Бошқа майдонлар автомат тўлдирилди.
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}



              {/* Main Form */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`rounded-3xl border p-6 sm:p-8 ${cardBg}`}
              >
                <div className='grid grid-cols-1 gap-6'>
                  {/* Left Column - Basic Info */}
                  <div className='space-y-6'>
                    {/* 🔹 АРТ with Scanner */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold flex items-center justify-between ${textColor}`}>
                        <div className='flex items-center gap-2'>
                          <IdCard size={16} className='text-blue-500' />
                          АРТ <span className='text-red-500'>*</span>
                        </div>
                        <button
                          type='button'
                          onClick={() => {
                            setShowScanner(true)
                            startScan()
                          }
                          }
                          className='flex items-center gap-1 px-3 py-1 text-xs rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors'
                        >
                          <QrCode size={12} />
                          Сканер
                        </button>
                      </label>
                      <div className='relative'>
                        <input
                          type='text'
                          value={productData.sku}
                          onChange={e => handleChange('sku', e.target.value)}
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all pr-10 ${inputBg}`}
                          placeholder='АРТ'
                          required
                          disabled={skuStatus === 'exists'}
                        />
                        {checkingSku &&
                          <div
                            className='absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                          >
                            <Loader2 size={18} className='animate-spin' />
                          </div>}
                        {productData.sku && (
                          <button
                            type='button'
                            onClick={() => handleChange('sku', '')}
                            className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                          >
                            <X size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* 🔹 Номи */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold flex items-center gap-2 ${textColor}`}>
                        <Package size={16} className='text-blue-500' />
                        Номи <span className='text-red-500'>*</span>
                      </label>
                      <input
                        type='text'
                        value={productData.title}
                        onChange={e => handleChange('title', e.target.value)}
                        className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${inputBg}`}
                        placeholder='Маҳсулот номи'
                        required
                        disabled={skuStatus === 'exists'}
                      />
                    </div>

                    {/* 📦 Дона сони */}
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold flex items-center gap-2 ${textColor}`}>
                        <Box size={16} className='text-purple-500' />
                        Дона сони <span className='text-red-500'>*</span>
                      </label>
                      <div className='relative'>
                        <input
                          type='number'
                          min='0'
                          value={productData.count}
                          onChange={e => handleChange('count', e.target.value)}
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all ${inputBg}`}
                          placeholder='0'
                          required
                        />
                        <div className='absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1'>
                          <button
                            type='button'
                            onClick={() => handleChange('count', Math.max(0, (productData.count || 0) - 1))}
                            className={`p-1.5 rounded-lg ${dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                          >
                            <span className='h-3 w-3 flex items-center justify-center'>-</span>
                          </button>
                          <button
                            type='button'
                            onClick={() => handleChange('count', (productData.count || 0) + 1)}
                            className={`p-1.5 rounded-lg ${dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                      </div>
                      {skuStatus === 'exists' && existingProduct && (
                        <p className='text-xs text-gray-500'>
                          Ҳозирги дона: {existingProduct.count || 0} | Қўшилаётган: {(existingProduct.count || 0) + (productData.count || 0)} дона
                        </p>
                      )}
                    </div>
                    <div className='space-y-3'>
                      <label className={`text-sm font-semibold flex items-center gap-2 ${textColor}`}>
                        <Captions size={16} className='text-purple-500' />
                        Категория <span className='text-red-500'>*</span>
                      </label>
                      <div className='relative'>
                        <select
                          value={productData.category}
                          onChange={e => handleChange('category', e.target.value)}
                          className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${inputBg}`}
                          disabled={skuStatus === 'exists'}
                        >
                          {categories.map(cat => (
                            <option key={cat.value} value={cat.value}>
                              {cat.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 📸 Асосий расмлар */}
                <div className='mt-8'>
                  {/* File input */}
                  <div className='mb-6'>
                    <input
                      type="file"
                      id="main-images"
                      multiple
                      accept="image/*"
                      onChange={handleMainImagesUpload}
                      className="hidden"
                      disabled={imageUploading || skuStatus === 'exists'}
                      ref={mainImagesInputRef}
                    />
                    <label
                      htmlFor="main-images"
                      className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all hover:scale-[1.02] ${dark
                        ? 'border-gray-600 hover:border-blue-500 hover:bg-blue-900/20'
                        : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
                        } ${imageUploading || skuStatus === 'exists' ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {imageUploading ? (
                        <Loader2 className='h-5 w-5 animate-spin text-gray-400' />
                      ) : (
                        <Upload className='h-5 w-5 text-gray-400' />
                      )}
                      <span className='font-medium'>
                        {imageUploading ? 'Юкланмоқда...' :
                          skuStatus === 'exists' ? 'Мавжуд маҳсулот учун расмлар ўзгартирилмайди' :
                            'Расмларни юклаш'}
                      </span>
                    </label>
                  </div>

                  {/* Preview images */}
                  {mainImages.length > 0 && (
                    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                      {mainImages.map((img, idx) => (
                        <div key={idx} className='relative group'>
                          <div className='aspect-square rounded-xl overflow-hidden border-2 border-transparent group-hover:border-blue-500 transition-all duration-300'>
                            <img
                              src={img}
                              alt={`Main ${idx + 1}`}
                              className='w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300'
                              onClick={() => setShowImagePreview(img)}
                            />
                          </div>
                          <button
                            onClick={() => removeMainImage(idx)}
                            className='absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-100 transition-opacity duration-300 hover:scale-110'
                            title='Ўчириш'
                            disabled={skuStatus === 'exists'}
                          >
                            <X size={14} />
                          </button>
                          <div className='absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full'>
                            {idx + 1}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className='flex flex-col sm:flex-row justify-end gap-4 mt-10 pt-8 border-t border-gray-200 dark:border-gray-700'>
                  <button
                    onClick={() => setOpen(false)}
                    className={`px-8 py-3 rounded-xl border-2 transition-all font-medium ${dark
                      ? 'border-gray-600 hover:bg-gray-700 text-white'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                      } hover:scale-105`}
                  >
                    Бекор қилиш
                  </button>

                  {skuStatus === 'exists' ? (
                    <button
                      onClick={handleSubmit}
                      disabled={loading || productData.count <= 0}
                      className='flex items-center justify-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                    >
                      {loading ? (
                        <>
                          <Loader2 className='h-5 w-5 animate-spin' />
                          Сақланишда...
                        </>
                      ) : (
                        <>
                          <Plus className='h-5 w-5' />
                          {productData.count} дона қўшиш
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      disabled={loading}
                      className='flex items-center justify-center gap-3 px-8 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed font-medium'
                    >
                      {loading ? (
                        <>
                          <Loader2 className='h-5 w-5 animate-spin' />
                          Сақланишда...
                        </>
                      ) : (
                        <>
                          <CheckCircle className='h-5 w-5' />
                          Маҳсулотни сақлаш
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>

              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 rounded-xl ${dark ? 'bg-red-900/30 border-red-700' : 'bg-red-50 border-red-200'} border`}
                >
                  <p className='text-red-500 text-sm'>{error}</p>
                </motion.div>
              )}

            </motion.div>
          </div>

          {/* QR Scanner Modal */}
          <AnimatePresence>
            {showScanner && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='fixed inset-0 bg-black/90 backdrop-blur-sm z-[101] flex items-center justify-center p-4'
                onClick={() => {
                  setShowScanner(false)
                  stopScan()
                }}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  ref={scannerContainerRef}
                  className={`relative ${cameraFullscreen ? 'w-screen h-screen' : 'max-w-4xl w-full'} bg-gray-900 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300`}
                  onClick={e => e.stopPropagation()}
                >
                  <div className='p-4 sm:p-6 bg-gradient-to-r from-blue-700 to-blue-900'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-3'>
                        <Camera className='h-6 w-6 text-white' />
                        <h3 className='text-xl font-bold text-white'>
                          QR код сканер (АРТ)
                        </h3>
                      </div>
                      <div className='flex items-center gap-2'>
                        <button
                          onClick={toggleCameraFullscreen}
                          className='p-2 hover:bg-blue-800 rounded-lg transition-colors text-white'
                          title={cameraFullscreen ? 'Кичрайтириш' : 'Катталаштириш'}
                        >
                          {cameraFullscreen ? (
                            <Minimize2 className='h-5 w-5' />
                          ) : (
                            <Maximize2 className='h-5 w-5' />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setShowScanner(false)
                            stopScan()
                          }}
                          className='p-2 hover:bg-blue-800 rounded-lg transition-colors'
                        >
                          <X className='h-5 w-5 text-white' />
                        </button>
                      </div>
                    </div>
                    <p className='text-blue-200 text-sm mt-2'>
                      АРТ учун QR кодни камерага кўрсатинг
                    </p>
                  </div>

                  <div className='p-4'>
                    {scanError && (
                      <div className='mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg'>
                        <p className='text-red-300 text-sm'>{scanError}</p>
                      </div>
                    )}

                    <div className='relative'>
                      <div className='relative rounded-xl overflow-hidden bg-black'>
                        <video
                          ref={videoRef}
                          className={`w-full ${cameraFullscreen ? 'h-[calc(100vh-180px)]' : 'h-[500px]'} object-cover`}
                          playsInline
                          autoPlay
                          muted
                        />
                        <button
                          onClick={toggleFlashlight} // <-- shu o‘zgardi
                          className='absolute bottom-10 right-10 text-white bg-green-500 p-4 rounded-2xl'
                        >
                          {flashlightOn ? <Flashlight /> : <FlashlightOff />}
                        </button>
                        {/* Scanning overlay */}
                        {scanning && (
                          <>
                            <div className='absolute inset-0 border-2 border-blue-500/30 pointer-events-none'></div>

                            <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64'>
                              <div className='absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-500'></div>
                              <div className='absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-500'></div>
                              <div className='absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-500'></div>
                              <div className='absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-500'></div>

                              <div className='absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan'>

                              </div>
                            </div>

                            <div className='absolute bottom-4 left-0 right-0 text-center'>
                              <div className='inline-block bg-black/70 text-white px-4 py-2 rounded-full text-sm'>
                                📷 QR кодни марказга келтиринг
                              </div>
                            </div>
                          </>
                        )}

                        {/* Camera controls */}
                        <div className='absolute bottom-4 right-4 flex items-center gap-2'>
                          {/* {!scanning && (
                            <button
                              onClick={() => startScan()}
                              className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all hover:scale-105'
                            >
                              <Camera className='h-4 w-4' />
                              Сканерни бошлаш
                            </button>
                          )} */}
                        </div>
                      </div>

                      <canvas
                        ref={canvasRef}
                        className='hidden'
                      />
                    </div>

                    {scanResult && (
                      <div className='mt-4 p-4 bg-green-900/30 border border-green-700 rounded-xl'>
                        <div className='flex items-center justify-between'>
                          <div>
                            <p className='text-green-300 text-sm font-medium'>
                              Муваффақиятли сканланди:
                            </p>
                            <p className='text-green-400 text-lg font-mono mt-1 break-all'>
                              {scanResult}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setScanResult('')
                              startScan()
                            }}
                            className='p-2 hover:bg-green-800 rounded-lg transition-colors'
                            title='Янги скан'
                          >
                            <Camera className='h-5 w-5 text-green-300' />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Image Preview Modal */}
          <AnimatePresence>
            {showImagePreview && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='fixed inset-0 bg-black/90 backdrop-blur-sm z-[101] flex items-center justify-center p-4'
                onClick={() => setShowImagePreview(null)}
              >
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.9 }}
                  className='relative max-w-4xl max-h-[90vh]'
                  onClick={e => e.stopPropagation()}
                >
                  <img
                    src={showImagePreview}
                    alt='Preview'
                    className='w-full h-full max-w-[70vw] max-h-[70vh] object-contain rounded-lg'
                  />
                  <button
                    onClick={() => setShowImagePreview(null)}
                    className='absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors'
                  >
                    <X size={20} />
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )
      }
    </AnimatePresence >
  )
}