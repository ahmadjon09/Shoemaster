import {
  useState, useEffect, useContext, useCallback, useRef, useMemo
} from 'react'
import {
  Plus,
  Minus,
  Save,
  Search,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  MapPin,
  Users,
  Package,
  QrCode,
  Scan,
  Camera,
  Maximize2,
  Minimize2,
  VideoOff,
  ArrowLeft,
  Trash2,
  Box,
  Upload,
  ImageIcon,
  Edit2,
  UserPlus,
  Flashlight,
  FlashlightOff,
  ChevronDown,
  Filter,
  List,
  Grid
} from 'lucide-react'
import jsQR from 'jsqr'
import Fetch from '../middlewares/fetcher'
import { ContextData } from '../contextData/Context'
import { mutate } from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import { scanned } from '../assets/js/saund'

export const AddNewOrder = () => {
  const { user } = useContext(ContextData)
  const navigate = useNavigate()
  const { id, name, phone } = useParams()

  useEffect(() => {
    if (
      id !== "empty" &&
      name !== "empty" &&
      phone !== "empty"
    ) {
      const clientV2 = {
        _id: id,
        fullName: name,
        phoneNumber: phone
      }

      handleSelectClient(clientV2)
    }
  }, [id, name, phone])

  // State variables
  const [allOrders, setAllOrders] = useState([])
  const [selectedProducts, setSelectedProducts] = useState([])
  const [status, setStatus] = useState('Тасдиқланди')
  const [payType, setPayType] = useState('Нақд')
  const [totalPrice, setTotalPrice] = useState(0)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)
  const [showClientsList, setShowClientsList] = useState(false)
  const [isEditingClient, setIsEditingClient] = useState(false)
  const [flashlightOn, setFlashlightOn] = useState(false)

  // Scanner states
  const [showScanner, setShowScanner] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState('')
  const [scanError, setScanError] = useState('')
  const [cameraFullscreen, setCameraFullscreen] = useState(false)
  const [scannedProducts, setScannedProducts] = useState(new Set())
  const [isProcessingScan, setIsProcessingScan] = useState(false)

  // Product search states
  const [showProductSearch, setShowProductSearch] = useState(false)
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(false)
  const [productSearchQuery, setProductSearchQuery] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [productStockType, setProductStockType] = useState('all')
  const [productDate, setProductDate] = useState('')
  const [productPage, setProductPage] = useState(1)
  const [productTotalPages, setProductTotalPages] = useState(1)
  const [productViewMode, setProductViewMode] = useState('grid') // 'grid' or 'list'
  const [selectedCategories, setSelectedCategories] = useState([])

  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const scannerContainerRef = useRef(null)
  const fileInputRef = useRef(null)
  const scannedOnceRef = useRef(false)
  const streamRef = useRef(null)

  // Client data
  const [clientData, setClientData] = useState({
    clientId: "",
    name: '',
    phoneNumber: '',
    address: ''
  })

  // ✅ Fetch all orders for clients extraction
  const fetchAllOrders = useCallback(async () => {
    setOrdersLoading(true)
    try {
      const response = await Fetch.get('/orders')
      setAllOrders(response.data?.data || [])
    } catch (err) {
      console.error('❌ Буюртмаларни олишда хатолик:', err)
      setMessage({ type: 'error', text: 'Буюртмаларни юклашда хатолик!' })
    } finally {
      setOrdersLoading(false)
    }
  }, [])

  // ✅ Extract clients from orders
  const clients = useMemo(() => {
    if (!allOrders.length) return []

    const clientsMap = {}
    allOrders.forEach(order => {
      if (order.client && order.client._id) {
        const clientId = order.client._id
        if (!clientsMap[clientId]) {
          clientsMap[clientId] = {
            ...order.client,
            _id: clientId,
            orders: [],
            totalOrders: 0,
            totalSpent: 0
          }
        }
        clientsMap[clientId].orders.push(order)
        clientsMap[clientId].totalOrders += 1
        clientsMap[clientId].totalSpent += (order.totalPrice || 0)
      }
    })
    return Object.values(clientsMap).sort((a, b) =>
      b.totalOrders - a.totalOrders
    )
  }, [allOrders])

  // ✅ Filtered clients
  const filteredClients = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients.slice(0, 10)
    const query = clientSearchQuery.toLowerCase().trim()
    return clients.filter(client => {
      return (
        client.phoneNumber?.toLowerCase().includes(query) ||
        client.name?.toLowerCase().includes(query) ||
        client.address?.toLowerCase().includes(query)
      )
    }).slice(0, 20)
  }, [clients, clientSearchQuery])

  // ✅ Fetch products for search
  const fetchProducts = useCallback(async (page = 1) => {
    setLoadingProducts(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search: productSearchQuery,
        category: productCategory,
        date: productDate,
        type: productStockType
      }).toString()

      const response = await Fetch.get(`/products?${params}`)
      const data = response.data

      if (page === 1) {
        setProducts(data.data || [])
      } else {
        setProducts(prev => [...prev, ...(data.data || [])])
      }

      setProductPage(page)
      setProductTotalPages(data.pagination?.totalPages || 1)

      // Extract unique categories
      if (page === 1 && data.data) {
        const categories = [...new Set(data.data.map(p => p.category).filter(Boolean))]
        setSelectedCategories(categories)
      }
    } catch (err) {
      console.error('❌ Маҳсулотларни олишда хатолик:', err)
      setMessage({ type: 'error', text: 'Маҳсулотларни юклашда хатолик!' })
    } finally {
      setLoadingProducts(false)
    }
  }, [productSearchQuery, productCategory, productDate, productStockType])

  // ✅ Handle product search
  const handleProductSearch = useCallback((e) => {
    e?.preventDefault()
    fetchProducts(1)
  }, [fetchProducts])

  // ✅ Handle scanner search
  const handleScannerSearch = useCallback(async (modelId) => {
    if (!modelId.trim() || scannedProducts.has(modelId) || isProcessingScan) return
    setIsProcessingScan(true);
    setScanError('');
    setScannedProducts(prev => new Set([...prev, modelId]));
    try {
      const { data } = await Fetch.get(`/products/qr/scann/${modelId.trim()}`)

      if (data?.product) {
        const productTypeData = data.product
        const existingIndex = selectedProducts.findIndex(
          p => p.productId === productTypeData._id
        )
        if (existingIndex !== -1) {
          setSelectedProducts(prev => {
            const updated = [...prev]
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + 1
            }
            return updated
          })

          setMessage({
            type: 'success',
            text: `✅ ${productTypeData.title} миқдори ортди (ҳозир: ${selectedProducts[existingIndex].quantity + 1})`
          })
        } else {
          const newProduct = {
            _id: `${Date.now()}-${productTypeData._id}-${productTypeData.model}`,
            productId: productTypeData._id,
            title: productTypeData.title,
            category: productTypeData.category,
            model: productTypeData.model,
            sku: productTypeData.sku,
            color: productTypeData.color || '--',
            size: productTypeData.size || '--',
            style: productTypeData.style || '--',
            price: productTypeData.price || 0,
            quantity: 1,
            count: productTypeData.count || 0,
            images: productTypeData.images || [],
            unit: productTypeData.unit || 'дона'
          }

          setSelectedProducts(prev => [...prev, newProduct])
          setMessage({
            type: 'success',
            text: `✅ ${productTypeData.title} қўшилди (${productTypeData.model})`
          })
        }
      } else {
        throw new Error('Махсулот маълумотлари топилмади')
      }
    } catch (err) {
      console.error('❌ Сканнер хатолик:', err.response?.data || err);
      setScanError(err.response?.data?.message || 'Модель ID си бўйича махсулот топилмади')
      setMessage({
        type: 'error',
        text: `❌ ${modelId} кодли маҳсулот топилмади`
      })
    } finally {
      setIsProcessingScan(false);
      setTimeout(() => {
        setScannedProducts(prev => {
          const newSet = new Set(prev)
          newSet.delete(modelId)
          return newSet
        })
      }, 2000);
    }
  }, [selectedProducts, scannedProducts, isProcessingScan])

  // ✅ Handle add product manually
  const handleAddProduct = useCallback((product) => {
    const existingIndex = selectedProducts.findIndex(
      p => p.productId === product._id
    )

    if (existingIndex !== -1) {
      setSelectedProducts(prev => {
        const updated = [...prev]
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1
        }
        return updated
      })

      setMessage({
        type: 'success',
        text: `✅ ${product.title} миқдори ортди (ҳозир: ${selectedProducts[existingIndex].quantity + 1})`
      })
    } else {
      const newProduct = {
        _id: `${Date.now()}-${product._id}-${product.model || product.sku}`,
        productId: product._id,
        title: product.title,
        category: product.category,
        model: product.model,
        sku: product.sku,
        color: product.color || '--',
        size: product.size || '--',
        style: product.style || '--',
        price: product.price || 0,
        quantity: 1,
        count: product.count || 0,
        images: product.images || [],
        unit: product.unit || 'дона'
      }

      setSelectedProducts(prev => [...prev, newProduct])
      setMessage({
        type: 'success',
        text: `✅ ${product.title} қўшилди (${product.sku})`
      })
    }

    // Close modal if product added successfully
    setShowProductSearch(false)
  }, [selectedProducts])

  const startScan = async () => {
    stopScan()
    try {
      stopScan()
      setScanError('')
      setScanResult('')
      setCameraFullscreen(false)
      scannedOnceRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
      })
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', true)
        await videoRef.current.play()
        setScanning(true)
      }
    } catch (err) {
      console.error('Camera error:', err)
      setScanError('Камера очилмади. Илтимос, рухсат беринг.')
    }
  }

  const stopScan = () => {
    setScanning(false)
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => {
        t.stop()
      })
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

  // Scan loop - YANGILANDI
  useEffect(() => {
    if (!scanning || !showScanner) return;

    const scanSound = new Audio(`data:audio/wav;base64,${scanned}`);
    scanSound.volume = 1;

    let lastScanTime = 0;
    const SCAN_COOLDOWN = 1000;
    let lastScannedData = null;

    const scanFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (!video || !canvas || video.videoWidth === 0) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        rafRef.current = requestAnimationFrame(scanFrame);
        return;
      }

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // 🔍 ZOOM + CENTER CROP
      const zoom = 1.6;
      const sw = canvas.width / zoom;
      const sh = canvas.height / zoom;
      const sx = (canvas.width - sw) / 2;
      const sy = (canvas.height - sh) / 2;

      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth"
        });

        if (code?.data) {
          const scannedData = code.data.trim();
          const now = Date.now();

          // 🔑 Cooldown tekshirish
          if (scannedData === lastScannedData && now - lastScanTime < SCAN_COOLDOWN) {
            rafRef.current = requestAnimationFrame(scanFrame);
            return;
          }

          lastScanTime = now;
          lastScannedData = scannedData;

          // 🔊 Ovoz
          scanSound.currentTime = 0;
          scanSound.play().catch(() => { });

          setScanResult(scannedData);

          handleScannerSearch(scannedData).then(fetchedProduct => {
            if (!fetchedProduct) return;

            setSelectedProducts(prev =>
              prev.map(p => {
                if (p._id === fetchedProduct._id) {
                  const newQty = Math.min(
                    (p.quantity || 0) + 1,
                    fetchedProduct.count // max count backenddan
                  );
                  return { ...p, quantity: newQty };
                }
                return p;
              })
            );
          });
        }
      } catch (err) {
        console.error("QR scanning error:", err);
      }

      // 🔁 Scanner doimiy ishlaydi
      if (scanning && showScanner) {
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    };

    rafRef.current = requestAnimationFrame(scanFrame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [scanning, showScanner, handleScannerSearch]);

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
        !!document.fullscreenElement ||
        !!document.webkitFullscreenElement ||
        !!document.mozFullScreenElement
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

  // ✅ Handle manual scanner input
  const handleManualScanner = useCallback((e) => {
    e.preventDefault()
    const code = scanResult.trim()
    if (code && !isProcessingScan) {
      handleScannerSearch(code)
      setScanResult('')
    }
  }, [scanResult, handleScannerSearch, isProcessingScan])

  // ✅ Handle image upload for QR scanning
  const handleImageUpload = useCallback((e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)

        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, canvas.width, canvas.height)

          if (code?.data) {
            setScanResult(code.data)
            handleScannerSearch(code.data)
          } else {
            setMessage({
              type: 'error',
              text: 'Расмда QR код топилмади'
            })
          }
        } catch (err) {
          console.error('Image QR scan error:', err)
          setMessage({
            type: 'error',
            text: 'QR кодни ўқишда хатолик'
          })
        }
      }
      img.src = event.target.result
    }
    reader.readAsDataURL(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleScannerSearch])

  // ✅ Handle client selection
  const handleSelectClient = useCallback((client) => {
    setClientData({
      clientId: client._id,
      name: client.fullName,
      phoneNumber: client.phoneNumber,
      address: client.address || ''
    })

    setShowClientsList(false)
    setClientSearchQuery('')
    setIsEditingClient(false)

    setMessage({
      type: 'success',
      text: `✅ Мижоз танланди: ${client.fullName}`
    })
  }, [])

  // ✅ Handle clear client
  const handleClearClient = useCallback(() => {
    setClientData({
      clientId: '',
      name: '',
      phoneNumber: '',
      address: ''
    })
    setClientSearchQuery('')
    setIsEditingClient(false)
  }, [])

  // ✅ Handle add new client
  const handleAddNewClient = useCallback(() => {
    setIsEditingClient(true)
    setShowClientsList(false)
    setClientData({
      clientId: '',
      name: '',
      phoneNumber: '',
      address: ''
    })
  }, [])

  // ✅ Handle client field changes
  const handleClientChange = useCallback((field, value) => {
    setClientData(prev => ({
      ...prev,
      [field]: value
    }))
  }, [])

  // ✅ Product quantity change
  const handleQuantityChange = useCallback((id, delta) => {
    setSelectedProducts(prev =>
      prev.map(p =>
        p._id === id
          ? {
            ...p,
            quantity: Math.max(1, p.quantity + delta)
          }
          : p
      )
    )
  }, [])

  // ✅ Product price change
  const handlePriceChange = useCallback((id, price) => {
    const numPrice = Number(price.replace(/\D/g, '')) || 0
    setSelectedProducts(prev =>
      prev.map(p =>
        p._id === id
          ? { ...p, price: numPrice }
          : p
      )
    )
  }, [])

  // ✅ Product quantity input change
  const handleInputQuantityChange = useCallback((id, value) => {
    const num = Number(value)
    if (isNaN(num) || num < 1) return

    setSelectedProducts(prev =>
      prev.map(p => {
        if (p._id === id) {
          return { ...p, quantity: num }
        }
        return p
      })
    )
  }, [])

  // ✅ Remove product
  const handleRemoveProduct = useCallback((id) => {
    const product = selectedProducts.find(p => p._id === id)
    if (product) {
      setScannedProducts(prev => {
        const newSet = new Set(prev)
        newSet.delete(product.model)
        return newSet
      })
    }
    setSelectedProducts(prev => prev.filter(p => p._id !== id))
  }, [selectedProducts])

  // ✅ Calculate total price
  useEffect(() => {
    const total = selectedProducts.reduce(
      (sum, item) => sum + (item.price || 0) * item.quantity,
      0
    )
    setTotalPrice(total)
  }, [selectedProducts])

  // ✅ Submit order
  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validation
    if (selectedProducts.length === 0) {
      return setMessage({
        type: 'error',
        text: 'Ҳеч қандай маҳсулот танланмаган! Сканнер ёрдамида маҳсулот қўшинг.'
      })
    }

    if (!clientData.name.trim()) {
      return setMessage({
        type: 'error',
        text: 'Мижоз исмини киритинг!'
      })
    }

    if (!clientData.phoneNumber.trim()) {
      return setMessage({
        type: 'error',
        text: 'Мижоз телефон рақамини киритинг!'
      })
    }

    const productsWithoutPrice = selectedProducts.filter(p => !p.price || p.price <= 0)
    if (productsWithoutPrice.length > 0) {
      return setMessage({
        type: 'error',
        text: `Ҳали нарх белгиланмаган маҳсулотлар бор: ${productsWithoutPrice.map(p => p.title).join(', ')}`
      })
    }

    setSubmitting(true)
    try {
      const orderData = {
        customer: user._id,

        products: selectedProducts.map(p => ({
          product: p.productId,              // ✅ backend kutyapti
          quantity: Number(p.quantity) || 0, // ✅ amount emas
          price: Number(p.price) || 0,

          // 🔹 ixtiyoriy qo'shimcha info (order schema'da bo'lsa)
          model: p.model,
          unit: p.unit,
          variant: {
            color: p.color,
            size: p.size,
            style: p.style
          }
        })),

        ...(clientData.clientId
          ? {
            clientId: clientData.clientId
          }
          : {
            client: {
              fullName: clientData.name.trim(),
              phoneNumber: clientData.phoneNumber.trim(),
              address: clientData.address?.trim() || "Манзил кўрсатилмаган"
            }
          }
        ),

        status,
        payType,
      };

      await Fetch.post('/orders/new', orderData)

      setMessage({
        type: 'success',
        text: `✅ Буюртма муваффақиятли яратилди! Жами: ${totalPrice.toLocaleString()} сўм`
      })

      // Update SWR cache
      mutate('/orders')
      mutate('/products')

      // Reset form
      setSelectedProducts([])
      setScannedProducts(new Set())
      setStatus('Тасдиқланди')
      setPayType('Нақд')
      setTotalPrice(0)
      setClientData({
        clientId: '',
        fullName: '',
        phoneNumber: '',
        address: ''
      })
      setScanResult('')

      if (showScanner) {
        stopScan()
        setShowScanner(false)
      }
      navigate('/order')

    } catch (err) {
      console.error('Buyurtma yaratish xatosi:', err)
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Буюртма яратишда хатолик ❌'
      })
      alert(err.response?.data?.message || 'Буюртма яратишда хатолик ❌')
    } finally {
      setSubmitting(false)
    }
  }

  // ✅ Cleanup on unmount
  useEffect(() => {
    fetchAllOrders()
    fetchProducts(1)

    return () => {
      stopScan()
      if (document.fullscreenElement) {
        document.exitFullscreen()
      }
    }
  }, [fetchAllOrders])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6">
      <div>
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
          >
            <ArrowLeft size={20} />
            Орқага
          </button>

          <div className='flex items-center gap-3'>
            <div className="p-3 rounded-xl bg-blue-100">
              <Package size={28} className='text-blue-600' />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                Янги буюртма яратиш
              </h1>
              <p className="text-gray-600">
                Сканнер ёрдамида маҳсулот қўшинг ва мижозни танланг
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='space-y-8'>
          {/* Product Selection Section */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className='flex flex-wrap gap-2 items-center justify-between mb-6'>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-1">
                  <Package size={20} className='text-blue-500' />
                  Маҳсулот танлаш
                </h3>
                <p className="text-gray-600">
                  Сканнер ёки қўлда танлаб маҳсулот қўшинг
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowProductSearch(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl transition-all duration-200"
                >
                  <Search size={16} />
                  Қўлда танлаш
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowScanner(!showScanner)
                    if (!showScanner) {
                      setTimeout(() => startScan(), 300)
                    } else {
                      stopScan()
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200"
                >
                  {showScanner ? (
                    <>
                      <VideoOff size={16} />
                      Япиш
                    </>
                  ) : (
                    <>
                      <Camera size={16} />
                      Сканнер очиш
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Manual Scanner Input */}
            <div className="mb-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold flex items-center gap-2 text-gray-800">
                  <QrCode size={16} className='text-blue-500' />
                  Қўлда киритиш (QR код)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={scanResult}
                    onChange={(e) => setScanResult(e.target.value)}
                    placeholder="QR код ёки модель ID сини киритинг..."
                    className="w-full border-2 border-gray-300 rounded-xl px-12 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  />
                  <QrCode
                    className='absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400'
                    size={20}
                  />
                  {scanResult && (
                    <button
                      type='button'
                      onClick={() => setScanResult('')}
                      className='absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    type='button'
                    onClick={handleManualScanner}
                    disabled={!scanResult.trim() || isProcessingScan}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessingScan ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        Сканерлаш...
                      </>
                    ) : (
                      <>
                        <Scan size={16} />
                        Сканерлаш
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-all duration-200"
                  >
                    <Upload size={16} />
                    Расм юклаш
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Products */}
            {selectedProducts.length > 0 ? (
              <div className="mt-8">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <CheckCircle size={20} className='text-green-500' />
                    Танланган маҳсулотлар ({selectedProducts.length})
                  </h4>
                  <div className="text-lg font-bold text-green-600">
                    Жами: {totalPrice.toLocaleString()} сўм
                  </div>
                </div>

                <div className="space-y-4">
                  {selectedProducts.map((item, index) => (
                    <ProductItem
                      maxcount={selectedProducts.count}
                      key={item._id}
                      item={item}
                      index={index}
                      onQuantityChange={handleQuantityChange}
                      onInputQuantityChange={handleInputQuantityChange}
                      onPriceChange={handlePriceChange}
                      onRemove={handleRemoveProduct}
                    />
                  ))}
                </div>

                <div className="mt-6 p-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-green-50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-gray-800 font-semibold mb-1">Жами сумма:</h5>
                      <p className="text-sm text-gray-600">{selectedProducts.length} та маҳсулот</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-green-600">
                        {totalPrice.toLocaleString()} сўм
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {totalPrice > 0 ? `(${(totalPrice / 12100).toFixed(2)} USD)` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 rounded-xl border border-gray-200 bg-gray-50">
                <Box size={48} className="mx-auto mb-3 text-gray-400" />
                <p className="font-medium text-gray-600">Маҳсулотлар қўшилмаган</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">
                  QR кодни сканнеринг ёки қўлда маҳсулот танланг
                </p>
                <button
                  type="button"
                  onClick={() => setShowProductSearch(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-xl font-medium transition-all"
                >
                  <Search size={16} />
                  Маҳсулотларни танлаш
                </button>
              </div>
            )}
          </div>

          {/* Hidden canvas for QR scanning */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Hidden file input for image upload */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />

          {/* Message Display */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`flex items-center gap-2 mb-6 p-4 rounded-xl border ${message.type === 'success'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : 'bg-red-100 text-red-700 border-red-200'
                  }`}
              >
                {message.type === 'success' ? (
                  <CheckCircle size={20} />
                ) : (
                  <AlertCircle size={20} />
                )}
                <span className='font-medium'>{message.text}</span>
                <button
                  onClick={() => setMessage(null)}
                  className="ml-auto p-1 hover:bg-white/50 rounded-lg"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mijoz ma'lumotlari */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className='flex flex-wrap gap-2 items-center justify-between mb-6'>
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Users size={20} className='text-blue-500' />
                Мижоз маълумотлари
              </h3>

              <div className="flex items-center gap-2">
                <button
                  type='button'
                  onClick={() => setShowClientsList(!showClientsList)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 ${showClientsList
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                >
                  <User size={16} />
                  {showClientsList ? 'Янги мижоз' : 'Мавжуд мижоз'}
                </button>

                {clientData.clientId && (
                  <button
                    type='button'
                    onClick={() => setIsEditingClient(!isEditingClient)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-xl transition-all duration-200"
                  >
                    <Edit2 size={16} />
                    Таҳрирлаш
                  </button>
                )}
              </div>
            </div>

            {showClientsList ? (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="Исм, телефон ёки манзил бўйича излаш..."
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    autoFocus
                  />
                </div>

                {ordersLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="animate-spin mx-auto mb-2 text-blue-600" size={24} />
                    <p className="text-gray-600">Мижозлар юкланмоқда...</p>
                  </div>
                ) : filteredClients.length > 0 ? (
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                    {filteredClients.map((client) => (
                      <motion.div
                        key={client._id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-4 border border-gray-200 rounded-xl cursor-pointer transition-all hover:shadow-md ${clientData.clientId === client._id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 hover:bg-white'
                          }`}
                        onClick={() => handleSelectClient(client)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-semibold text-gray-800">{client.fullName}</div>
                          <div className="text-sm text-gray-500">
                            {client.totalOrders} та буюртма
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Phone size={14} />
                            <span>{client.phoneNumber}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-200">
                    <User className="mx-auto mb-3 text-gray-400" size={32} />
                    <p className="font-medium text-gray-600">Мижозлар топилмади</p>
                    <p className="text-sm text-gray-500 mt-1">Янги мижоз қўшиш учун тугмани босинг</p>
                    <button
                      type="button"
                      onClick={handleAddNewClient}
                      className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
                    >
                      <UserPlus size={16} className="inline mr-2" />
                      Янги мижоз
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Исм <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={clientData.name}
                      onChange={(e) => handleClientChange('name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="Тўлиқ исм"
                      disabled={clientData.clientId && !isEditingClient}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Телефон <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={clientData.phoneNumber}
                      onChange={(e) => handleClientChange('phoneNumber', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="+998 XX XXX XX XX"
                      disabled={clientData.clientId && !isEditingClient}
                      required
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="text-sm text-gray-600">
                    {clientData.clientId ? (
                      <span className="text-green-600">✅ Мавжуд мижоз танланди</span>
                    ) : (
                      <span className="text-blue-600">🆕 Янги мижоз қўшилмоқда</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {clientData.clientId && (
                      <button
                        type="button"
                        onClick={handleClearClient}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-xl transition-all duration-200"
                      >
                        <X size={16} />
                        Тозалаш
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit buttons */}
          <div className='flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200'>
            <button
              type='button'
              onClick={() => navigate(-1)}
              disabled={submitting}
              className="flex items-center justify-center gap-2 px-8 py-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl font-semibold transition-all duration-200 w-full sm:w-auto disabled:opacity-50"
            >
              <X size={20} />
              Бекор қилиш
            </button>

            <button
              type='submit'
              disabled={submitting || selectedProducts.length === 0}
              className='flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto flex-1'
            >
              {submitting ? (
                <>
                  <Loader2 className='animate-spin' size={20} />
                  Сақланмоқда...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Буюртмани сақлаш ({selectedProducts.length} та маҳсулот)
                </>
              )}
            </button>
          </div>
        </form>
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
                      QR код сканер (Модель ID)
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
                  Маҳсулот учун QR кодни камерага кўрсатинг
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
                      className={`w-full ${cameraFullscreen ? 'h-[calc(100vh-180px)]' : 'h-[55vh]'} object-cover`}
                      playsInline
                      autoPlay
                      muted
                    />

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
                    <button
                      onClick={toggleFlashlight} // <-- shu o'zgardi
                      className='absolute bottom-10 right-10 text-white bg-green-500 p-4 rounded-2xl'
                    >
                      {flashlightOn ? <Flashlight /> : <FlashlightOff />}
                    </button>

                    {/* Camera controls */}
                    <div className='absolute bottom-4 right-4 flex items-center gap-2'>
                      {!scanning && (
                        <button
                          onClick={() => startScan()}
                          className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-medium transition-all hover:scale-105'
                        >
                          <Camera className='h-4 w-4' />
                          Сканерни бошлаш
                        </button>
                      )}
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

      {/* Product Search Modal */}
      <AnimatePresence>
        {showProductSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 overflow-y-hidden bg-black/90 backdrop-blur-sm z-[102] flex items-center justify-center p-4'
            onClick={() => setShowProductSearch(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className='relative max-w-6xl w-full max-h-[90vh] bg-white rounded-2xl overflow-y-auto shadow-2xl'
              onClick={e => e.stopPropagation()}
            >
              <div className='p-6 bg-gradient-to-r from-blue-600 to-green-600'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <Search className='h-6 w-6 text-white' />
                    <h3 className='text-2xl font-bold text-white'>
                      Маҳсулотларни танлаш
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowProductSearch(false)}
                    className='p-2 hover:bg-white/20 rounded-lg transition-colors'
                  >
                    <X className='h-6 w-6 text-white' />
                  </button>
                </div>
                <p className='text-blue-100 text-sm mt-2'>
                  Излаш ёрдамида маҳсулотларни кўриб чиқиб, танланг
                </p>
              </div>

              <div className='p-6 overflow-y-auto'>
                {/* Search and Filters */}
                <div className='mb-6 space-y-4'>
                  <form onSubmit={handleProductSearch} className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      value={productSearchQuery}
                      onChange={(e) => {
                        setProductSearchQuery(e.target.value)
                        handleProductSearch()
                      }}
                      placeholder="Ном, АРТ, модель ёки категория бўйича излаш..."
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                    <button
                      type="submit"
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Search size={16} />
                    </button>
                  </form>

                  <div className="flex flex-wrap gap-3">
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={() => setProductViewMode('grid')}
                        className={`p-2 rounded-lg ${productViewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                        title="Grid view"
                      >
                        <Grid size={16} />
                      </button>
                      <button
                        onClick={() => setProductViewMode('list')}
                        className={`p-2 rounded-lg ${productViewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                        title="List view"
                      >
                        <List size={16} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Products List/Grid */}
                {loadingProducts && productPage === 1 ? (
                  <div className="text-center py-12">
                    <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={32} />
                    <p className="text-gray-600">Маҳсулотлар юкланмоқда...</p>
                  </div>
                ) : products.length > 0 ? (
                  <>
                    <div className={`${productViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}`}>
                      {products.map((product) => (
                        <ProductSearchItem
                          key={product._id}
                          product={product}
                          viewMode={productViewMode}
                          onAdd={handleAddProduct}
                        />
                      ))}
                    </div>

                    {productPage < productTotalPages && (
                      <div className="mt-6 text-center">
                        <button
                          onClick={() => fetchProducts(productPage + 1)}
                          disabled={loadingProducts}
                          className="px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white rounded-xl font-medium disabled:opacity-50"
                        >
                          {loadingProducts ? (
                            <>
                              <Loader2 className="animate-spin inline mr-2" size={16} />
                              Юкланмоқда...
                            </>
                          ) : (
                            'Кўпроқ маҳсулотлар'
                          )}
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                    <Search size={48} className="mx-auto mb-4 text-gray-400" />
                    <p className="font-medium text-gray-600 mb-2">Маҳсулотлар топилмади</p>
                    <p className="text-gray-500">Бошқа параметрлар билан изланг ёки янги маҳсулот яратинг</p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ProductItem Component
const ProductItem = ({
  item,
  index,
  onQuantityChange,
  onInputQuantityChange,
  onPriceChange,
  onRemove
}) => {
  const [priceInput, setPriceInput] = useState(item.price?.toString() || '')
  const [showImagePreview, setShowImagePreview] = useState(null)
  const totalPrice = (item.price || 0) * item.quantity

  const handlePriceChangeLocal = (value) => {
    setPriceInput(value)
    const cleanValue = value.replace(/\D/g, '')
    onPriceChange(item._id, cleanValue)
  }

  const formatPrice = (price) => {
    if (!price) return '0'

    const cleaned = price
      .toString()
      .replace(/\s/g, '')
      .replace(/,/g, '')

    const num = Number(cleaned)
    if (isNaN(num)) return '0'

    return num.toLocaleString('uz-UZ')
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border border-gray-200 rounded-xl bg-white hover:shadow-sm transition-all duration-200"
      >
        <div className='flex-1 min-w-0 mb-4 md:mb-0'>
          <div className='flex items-start justify-between mb-3'>
            <div className='flex-1 min-w-0'>
              <div className="font-bold truncate mr-2 text-lg text-gray-800">
                {item.title}
              </div>
            </div>
            <button
              type='button'
              onClick={() => onRemove(item._id)}
              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition"
              title='Маҳсулотни ўчириш'
            >
              <Trash2 size={18} />
            </button>
          </div>
          <div className='flex gap-1 flex-wrap'><b>АРТ:</b> <i>{item.sku}</i></div>
          <div className="flex flex-wrap items-center gap-4">
            {item.count > 0 && (
              <div className="flex items-center gap-2">
                <b className="text-gray-600">Омборда:</b>
                <span className={`font-medium ${item.count < item.quantity ? 'text-red-600' : 'text-green-600'}`}>
                  {item.count} {item.unit}
                </span>
              </div>
            )}
          </div>

          {item.images && item.images.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <ImageIcon size={14} className="text-gray-500" />
              <button
                type='button'
                onClick={() => setShowImagePreview(item.images[0])}
                className="text-xs text-blue-600 hover:text-blue-700"
              >
                Расмни кўриш
              </button>
            </div>
          )}
        </div>

        <div className='flex flex-col md:flex-row items-center gap-6 w-full md:w-auto'>
          {/* Price Input */}
          <div className="w-full md:w-48">
            <label className="text-sm mb-1 block text-gray-600">Нарх</label>
            <div className="relative">
              <input
                type="text"
                value={formatPrice(priceInput)}
                onChange={(e) => handlePriceChangeLocal(e.target.value)}
                placeholder="Нарх"
                className="w-full px-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg font-medium text-right"
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                сўм
              </span>
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="w-full md:w-48">
            <label className="text-sm mb-1 block text-gray-600">Миқдор</label>
            <div className="flex items-center gap-3">
              <button
                type='button'
                onClick={() => onQuantityChange(item._id, -1)}
                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50"
                disabled={item.quantity <= 1}
              >
                <Minus size={16} />
              </button>

              <div className="flex-1 text-center">
                <input
                  type='number'
                  min='1'
                  value={item.quantity}
                  onChange={e => onInputQuantityChange(item._id, e.target.value)}
                  className="w-20 text-center border-0 bg-transparent outline-none text-lg font-medium text-gray-800"
                />
                <div className="text-xs mt-1 text-gray-500">{item.unit}</div>
              </div>

              <button
                type="button"
                onClick={() => onQuantityChange(item._id, 1)}
                disabled={item.quantity >= item.count}
                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} />
              </button>

            </div>
          </div>

          {/* Total Price */}
          <div className="text-center">
            <div className="text-sm mb-1 text-gray-600">Жами</div>
            <div className="text-xl font-bold text-green-600">
              {totalPrice.toLocaleString()} сўм
            </div>
            <div className="text-xs mt-1 text-gray-500">
              {item.quantity} × {item.price?.toLocaleString()}
            </div>
          </div>
        </div>
      </motion.div>

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
                className='w-full h-full object-contain rounded-lg'
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

// ProductSearchItem Component
const ProductSearchItem = ({ product, viewMode, onAdd }) => {
  const [showImagePreview, setShowImagePreview] = useState(null)

  const handleAdd = () => {
    onAdd(product)
  }

  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 "
      >
        <div className="flex items-start justify-between mb-3">
          {product.images && product.images.length > 0 ? (
            <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 mr-3">
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setShowImagePreview(product.images[0])}
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center mr-3">
              <Package className="text-gray-400" size={24} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-800 truncate">{product.title}</h4>
            <div className="text-sm text-gray-600 mt-1">
              <div className="flex items-center gap-2">
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {product.sku}
                </span>
                {product.category && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {product.category}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Омборда:</span>
            <span className={`font-medium ${product.count > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.count || 0} {product.unit || 'дона'}
            </span>
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={product.count <= 0}
          className={`w-full mt-4 py-2 rounded-lg font-medium transition-all ${product.count > 0
            ? 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white'
            : 'bg-gray-100 text-gray-500 cursor-not-allowed'
            }`}
        >
          {product.count > 0 ? 'Қўшиш' : 'Омборда йўқ'}
        </button>
      </motion.div>
    )
  }

  // List view
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4  bg-white border border-gray-200 rounded-xl hover:shadow-sm transition-all duration-200"
    >
      <div className="flex items-center gap-4">
        {product.images && product.images.length > 0 ? (
          <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
            <img
              src={product.images[0]}
              alt={product.title}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setShowImagePreview(product.images[0])}
            />
          </div>
        ) : (
          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
            <Package className="text-gray-400" size={20} />
          </div>
        )}

        <div className="min-w-0">
          <h4 className="font-semibold text-gray-800 truncate">{product.title}</h4>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-gray-600 font-mono">{product.sku}</span>
            {product.category && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {product.category}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className="font-bold text-green-600">
            {product.price?.toLocaleString()} сўм
          </div>
          <div className="text-sm text-gray-600">
            Омборда: <span className={product.count > 0 ? 'text-green-600' : 'text-red-600'}>
              {product.count || 0} {product.unit || 'дона'}
            </span>
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={product.count <= 0}
          className={`px-4 py-2 rounded-lg font-medium transition-all ${product.count > 0
            ? 'bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white'
            : 'bg-gray-100 text-gray-500 cursor-not-allowed'
            }`}
        >
          Қўшиш
        </button>
      </div>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {showImagePreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='fixed inset-0 bg-black/90 backdrop-blur-sm z-[103] flex items-center justify-center p-4'
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
                className='w-full h-full object-contain rounded-lg'
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
    </motion.div>
  )
}

