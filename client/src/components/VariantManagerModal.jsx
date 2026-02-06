import { useState, useContext, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X, Plus, Image as ImageIcon, Palette, Layers, Save, Trash2,
    Loader2, Ruler, Edit, Eye, Download, Upload, Check,
    RefreshCw, Grid3x3, Camera, Maximize2, Minimize2,
    ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Box, QrCode
} from 'lucide-react'
import Fetch from '../middlewares/fetcher'
import { ContextData } from '../contextData/Context'
import jsQR from 'jsqr'

// Ranglar palettasi
const COLOR_PALETTE = [
    { name: 'Қора', value: '#000000', textColor: 'text-white' },
    { name: 'Оқ', value: '#FFFFFF', textColor: 'text-black' },
    { name: 'Қизил', value: '#FF0000', textColor: 'text-white' },
    { name: 'Кўк', value: '#0000FF', textColor: 'text-white' },
    { name: 'Яшил', value: '#00FF00', textColor: 'text-black' },
    { name: 'Сариқ', value: '#FFFF00', textColor: 'text-black' },
    { name: 'Қўнғир', value: '#8B4513', textColor: 'text-white' },
    { name: 'Кулранг', value: '#808080', textColor: 'text-white' },
    { name: 'Тилларанг', value: '#FFD700', textColor: 'text-black' },
    { name: 'Кумүш', value: '#C0C0C0', textColor: 'text-black' },
    { name: 'Қизил-қўк', value: '#800080', textColor: 'text-white' },
    { name: 'Тилла', value: '#FFA500', textColor: 'text-black' },
    { name: 'Кўк-яшил', value: '#008080', textColor: 'text-white' },
    { name: 'Мовий', value: '#000080', textColor: 'text-white' },
    { name: 'Малахит', value: '#00FF7F', textColor: 'text-black' },
    { name: 'Қизил-сариқ', value: '#FF4500', textColor: 'text-white' },
]

// Ўлчовлар
const SIZE_OPTIONS = [
    '36', '37', '38', '39', '40', '41', '42', '43', '44', '45',
    '46', '47', '48', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL',
    'One Size', '32', '34', '36-38', '38-40', '40-42', '42-44',
    '46-48', '48-50', '50-52', '52-54', '54-56'
]

// Стиллар
const STYLE_OPTIONS = [
    { value: 'classic', label: 'Классик' },
    { value: 'sport', label: 'Спорт' },
    { value: 'casual', label: 'Кэжуал' },
    { value: 'formal', label: 'Расмий' },
    { value: 'modern', label: 'Модерн' },
    { value: 'vintage', label: 'Винтаж' },
    { value: 'elegant', label: 'Элегант' },
    { value: 'street', label: 'Стрит' },
    { value: 'luxury', label: 'Люкс' },
    { value: 'minimal', label: 'Минимал' },
]

const VariantManagerModal = ({ open, setOpen, product, mutate }) => {
    const { user } = useContext(ContextData)
    const [variants, setVariants] = useState([])
    const [loading, setLoading] = useState(false)
    const [newVariant, setNewVariant] = useState({
        model: '', // Model maydoni qo'shildi
        color: '',
        size: '',
        style: 'classic',
        images: [],
        count: 0
    })
    const [imageUploading, setImageUploading] = useState(false)
    const [imagePreview, setImagePreview] = useState(null)
    const [previewIndex, setPreviewIndex] = useState(0)
    const [showColorPicker, setShowColorPicker] = useState(false)
    const [showSizeDropdown, setShowSizeDropdown] = useState(false)
    const [showStyleDropdown, setShowStyleDropdown] = useState(false)
    const [showScanner, setShowScanner] = useState(false)
    const [scanning, setScanning] = useState(false)
    const [scanResult, setScanResult] = useState('')
    const [scanningFor, setScanningFor] = useState('') // 'model'
    const [draggingIndex, setDraggingIndex] = useState(null)
    const [draggingOverIndex, setDraggingOverIndex] = useState(null)
    const [uploadProgress, setUploadProgress] = useState({})
    const [zoomLevel, setZoomLevel] = useState(1)
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [activeTab, setActiveTab] = useState('list') // 'list' yoki 'grid'
    const [scanError, setScanError] = useState('')

    const fileInputRef = useRef(null)
    const colorPickerRef = useRef(null)
    const sizeDropdownRef = useRef(null)
    const styleDropdownRef = useRef(null)
    const imagePreviewRef = useRef(null)
    const modalRef = useRef(null)
    const videoRef = useRef(null)
    const canvasRef = useRef(null)
    const scannerContainerRef = useRef(null)
    const rafRef = useRef(null)

    // QR Scanner functions
    const startScan = async (forWhat = 'model') => {
        try {
            setScanningFor(forWhat)
            setScanError('')
            setScanResult('')

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "environment",
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
            })

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
        if (videoRef.current?.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(t => t.stop())
            videoRef.current.srcObject = null
        }
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current)
            rafRef.current = null
        }
    }

    const scanLoop = () => {
        if (!videoRef.current || !canvasRef.current || !scanning) return

        const video = videoRef.current
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')

        if (video.videoWidth === 0) {
            rafRef.current = requestAnimationFrame(scanLoop)
            return
        }

        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        try {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const code = jsQR(imageData.data, canvas.width, canvas.height)

            if (code?.data) {
                setScanResult(code.data)
                setNewVariant(prev => ({ ...prev, model: code.data }))

                setTimeout(() => {
                    stopScan()
                    setShowScanner(false)
                }, 1000)
                return
            }
        } catch (err) {
            console.error('QR scanning error:', err)
        }

        rafRef.current = requestAnimationFrame(scanLoop)
    }

    // Click outside handlers
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target)) {
                setShowColorPicker(false)
            }
            if (sizeDropdownRef.current && !sizeDropdownRef.current.contains(event.target)) {
                setShowSizeDropdown(false)
            }
            if (styleDropdownRef.current && !styleDropdownRef.current.contains(event.target)) {
                setShowStyleDropdown(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Escape tugmasi bilan yopish
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (imagePreview) {
                    setImagePreview(null)
                    setZoomLevel(1)
                } else if (open) {
                    setOpen(false)
                }
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [open, imagePreview])

    // Fullscreen toggle
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
    }, [])

    // Scanner cleanup
    useEffect(() => {
        return () => {
            stopScan()
        }
    }, [])

    useEffect(() => {
        if (product && open) {
            setVariants([...product.types])
        }
    }, [product, open])

    const handleAddVariant = () => {
        if (!newVariant.model.trim()) {
            alert('Модель номи мажбурий!')
            return
        }

        if (!newVariant.color.trim() || !newVariant.size.trim()) {
            alert('Ранг ва ўлчов мажбурий!')
            return
        }

        // Check if variant already exists
        const exists = variants.some(v =>
            v.model === newVariant.model &&
            v.color === newVariant.color &&
            v.size === newVariant.size &&
            v.style === newVariant.style
        )

        if (exists) {
            alert('Бу вариация аллақачон мавжуд!')
            return
        }

        setVariants([...variants, {
            model: newVariant.model.trim(),
            color: newVariant.color.trim(),
            size: newVariant.size.trim(),
            style: newVariant.style,
            images: [...newVariant.images],
            count: Number(newVariant.count) || 0
        }])

        setNewVariant({
            model: '',
            color: '',
            size: '',
            style: 'classic',
            images: [],
            count: 0
        })
        setShowColorPicker(false)
        setShowSizeDropdown(false)
        setShowStyleDropdown(false)
    }

    const handleRemoveVariant = (index) => {
        if (!confirm('Бу вариацияни ўчирмоқчимисиз? Барча расмлар ҳам ўчирилади.')) return

        const newVariants = [...variants]
        newVariants.splice(index, 1)
        setVariants(newVariants)
    }

    const handleUpdateVariant = (index, field, value) => {
        const newVariants = [...variants]

        if (field === 'count') {
            newVariants[index][field] = Math.max(0, Number(value) || 0)
        } else if (field === 'model' || field === 'color' || field === 'size') {
            newVariants[index][field] = value.trim()
        } else {
            newVariants[index][field] = value
        }

        setVariants(newVariants)
    }

    const uploadImageToServer = async (file) => {
        try {
            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch(
                `https://api.imgbb.com/1/upload?key=955f1e37f0aa643262e734c080305b10`,
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

    const handleImageUpload = async (event, variantIndex) => {
        const files = Array.from(event.target.files);
        if (files.length === 0) return;

        try {
            setImageUploading(true);
            setUploadProgress(prev => ({ ...prev, [variantIndex]: 0 }));
            const uploadedImages = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    const url = await uploadImageToServer(file);
                    uploadedImages.push(url);

                    setUploadProgress(prev => ({
                        ...prev,
                        [variantIndex]: Math.round(((i + 1) / files.length) * 100)
                    }));
                } catch (error) {
                    console.error(`Rasm yuklashda xatolik (${file.name}):`, error);
                    alert(`"${file.name}" расмини юклашда хатолик`);
                }
            }

            const newVariants = [...variants];
            if (!newVariants[variantIndex].images) {
                newVariants[variantIndex].images = [];
            }
            newVariants[variantIndex].images.push(...uploadedImages);
            setVariants(newVariants);

            setUploadProgress(prev => {
                const newProgress = { ...prev };
                delete newProgress[variantIndex];
                return newProgress;
            });
        } catch (error) {
            console.error('Umumiy rasm yuklashda xatolik:', error);
            alert('❌ Расм юклашда хатолик!');
        } finally {
            setImageUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleRemoveImage = (variantIndex, imageIndex) => {
        if (!confirm('Бу расмни ўчирмоқчимисиз?')) return

        const newVariants = [...variants]
        newVariants[variantIndex].images.splice(imageIndex, 1)
        setVariants(newVariants)
    }

    const handleReplaceImage = async (event, variantIndex, imageIndex) => {
        const file = event.target.files[0]
        if (!file) return

        try {
            setImageUploading(true)
            const url = await uploadImageToServer(file)

            const newVariants = [...variants]
            newVariants[variantIndex].images[imageIndex] = url
            setVariants(newVariants)
            alert('✅ Расм муваффақиятли алмаштирилди!')
        } catch (error) {
            console.error('Расм алмаштиришда хатолик:', error)
            alert('❌ Расм алмаштиришда хатолик!')
        } finally {
            setImageUploading(false)
        }
    }

    const handleSave = async () => {
        try {
            setLoading(true)

            const cleanVariants = variants.map(variant => ({
                model: variant.model || '',
                color: variant.color,
                size: variant.size,
                style: variant.style || 'classic',
                images: variant.images || [],
                count: Number(variant.count) || 0
            }))

            const response = await Fetch.put(`/products/${product._id}`, {
                types: cleanVariants
            })

            if (response.data) {
                mutate()
                setOpen(false)
                alert('✅ Вариациялар муваффақиятли сақланди')
            } else {
                throw new Error('Server xatosi')
            }
        } catch (error) {
            console.error('Вариацияларни сақлашда хатолик:', error)
            alert(`❌ ${error.response?.data?.message || error.message || 'Вариацияларни сақлашда хатолик'}`)
        } finally {
            setLoading(false)
        }
    }

    // Drag and drop functions
    const handleDragStart = (e, index) => {
        setDraggingIndex(index)
        e.dataTransfer.effectAllowed = 'move'
    }

    const handleDragOver = (e, index) => {
        e.preventDefault()
        setDraggingOverIndex(index)
    }

    const handleDrop = (e, dropIndex) => {
        e.preventDefault()
        if (draggingIndex === null || draggingIndex === dropIndex) return

        const newVariants = [...variants]
        const [draggedItem] = newVariants.splice(draggingIndex, 1)
        newVariants.splice(dropIndex, 0, draggedItem)

        setVariants(newVariants)
        setDraggingIndex(null)
        setDraggingOverIndex(null)
    }

    const handleDragEnd = () => {
        setDraggingIndex(null)
        setDraggingOverIndex(null)
    }

    // Selection functions
    const selectColor = (color) => {
        setNewVariant({ ...newVariant, color: color.name })
        setShowColorPicker(false)
    }

    const selectSize = (size) => {
        setNewVariant({ ...newVariant, size })
        setShowSizeDropdown(false)
    }

    const selectStyle = (style) => {
        setNewVariant({ ...newVariant, style: style.value })
        setShowStyleDropdown(false)
    }

    // Image preview navigation
    const navigatePreview = (direction, currentIndex, variantIndex) => {
        const variant = variants[variantIndex]
        if (!variant || !variant.images) return

        const totalImages = variant.images.length
        let newIndex

        if (direction === 'next') {
            newIndex = (currentIndex + 1) % totalImages
        } else {
            newIndex = (currentIndex - 1 + totalImages) % totalImages
        }

        setPreviewIndex(newIndex)
        setImagePreview(variant.images[newIndex])
    }

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            if (modalRef.current) {
                modalRef.current.requestFullscreen().catch(err => {
                    console.error(`Fullscreen error: ${err.message}`)
                })
            }
        } else {
            document.exitFullscreen()
        }
    }

    // Calculate totals
    const totalStock = variants.reduce((sum, v) => sum + (v.count || 0), 0)
    const totalVariants = variants.length
    const totalImages = variants.reduce((sum, v) => sum + (v.images?.length || 0), 0)

    // Styles (faqat light mode)
    const bgColor = 'bg-white'
    const borderColor = 'border-gray-200'
    const textColor = 'text-gray-900'
    const textMuted = 'text-gray-600'
    const cardBg = 'bg-gray-50'
    const inputBg = 'bg-white border-gray-300 text-gray-900'
    const hoverBg = 'hover:bg-gray-100'
    const dropdownBg = 'bg-white border-gray-200'
    const modalBg = 'bg-white/95'

    if (user.role !== 'admin') {
        return (
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4'
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className={`w-full max-w-md rounded-2xl shadow-2xl ${bgColor} ${borderColor} border p-6`}
                        >
                            <div className='text-center'>
                                <X className='h-12 w-12 mx-auto mb-4 text-red-500' />
                                <h3 className={`text-xl font-bold mb-2 ${textColor}`}>
                                    ⛔
                                </h3>
                                <p className={`mb-6 ${textMuted}`}>
                                    Фақат администраторлар вариацияларни таҳрирлай олади
                                </p>
                                <button
                                    onClick={() => setOpen(false)}
                                    className={`px-6 py-2 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 ${textColor}`}
                                >
                                    Ёпиш
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        )
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className='fixed inset-0 bg-black/80 backdrop-blur-md z-40'
                        onClick={() => setOpen(false)}
                    />

                    {/* Main Modal - Mobile responsive */}
                    <div className='fixed inset-0 z-50 overflow-hidden'>
                        <motion.div
                            ref={modalRef}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 20 }}
                            className={`w-full h-full ${modalBg} backdrop-blur-xl flex flex-col`}
                        >
                            {/* Header - Mobile responsive */}
                            <div className={`sticky top-0 z-50 border-b ${borderColor} px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white/90 backdrop-blur-lg`}>
                                <div className='flex items-center gap-3 mb-2 sm:mb-0 w-full sm:w-auto'>
                                    <div className='p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg'>
                                        <Layers className='h-5 w-5 sm:h-6 sm:w-6 text-white' />
                                    </div>
                                    <div className='flex-1 min-w-0'>
                                        <h2 className={`text-lg sm:text-2xl font-bold ${textColor} truncate`}>
                                            {product?.title}
                                        </h2>
                                        <div className='flex flex-wrap items-center gap-2 mt-1'>
                                            <span className={`text-xs sm:text-sm ${textMuted} flex items-center gap-1`}>
                                                <span className='w-2 h-2 rounded-full bg-green-500'></span>
                                                <span className='font-semibold text-green-500'>{totalVariants}</span> вариация
                                            </span>
                                            <span className={`text-xs sm:text-sm ${textMuted} flex items-center gap-1`}>
                                                <span className='w-2 h-2 rounded-full bg-blue-500'></span>
                                                <span className='font-semibold text-blue-500'>{totalStock}</span> дона
                                            </span>
                                            <span className={`text-xs sm:text-sm ${textMuted} flex items-center gap-1`}>
                                                <span className='w-2 h-2 rounded-full bg-yellow-500'></span>
                                                <span className='font-semibold text-yellow-500'>{totalImages}</span> расм
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className='flex items-center gap-2 self-end sm:self-center'>
                                    <button
                                        onClick={toggleFullscreen}
                                        className={`p-2 sm:p-3 rounded-lg ${hoverBg} transition-colors`}
                                        title={isFullscreen ? 'Чиқиш' : 'Тўлиқ экран'}
                                    >
                                        {isFullscreen ? (
                                            <Minimize2 className={`h-4 w-4 sm:h-5 sm:w-5 ${textColor}`} />
                                        ) : (
                                            <Maximize2 className={`h-4 w-4 sm:h-5 sm:w-5 ${textColor}`} />
                                        )}
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (variants.length > 0 && !confirm('Барча ўзгаришларни йўқотишни хоҳлайсизми?')) return
                                            setOpen(false)
                                        }}
                                        className={`p-2 sm:p-3 rounded-lg ${hoverBg} transition-colors`}
                                    >
                                        <X className={`h-4 w-4 sm:h-5 sm:w-5 ${textColor}`} />
                                    </button>
                                </div>
                            </div>

                            {/* Main Content - Mobile responsive */}
                            <div className='flex-1 overflow-hidden flex flex-col lg:flex-row'>
                                {/* Left Sidebar - Add New Variant - Mobile hidden on small screens */}
                                <div className='hidden lg:block w-96 border-r border-gray-200 p-4 sm:p-6 overflow-y-auto flex-shrink-0'>
                                    <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 bg-gray-50 border border-gray-200 shadow-xl`}>
                                        <h3 className={`text-base sm:text-lg font-bold mb-4 sm:mb-6 ${textColor} flex items-center gap-2 sm:gap-3`}>
                                            <div className='p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gradient-to-r from-green-500 to-emerald-600'>
                                                <Plus className='h-4 w-4 sm:h-5 sm:w-5 text-white' />
                                            </div>
                                            Янги вариация қўшиш
                                        </h3>

                                        {/* Model Input with Scanner */}
                                        <div className='mb-4 sm:mb-6'>
                                            <label className={`text-sm font-semibold ${textMuted} block mb-2 sm:mb-3 flex items-center justify-between`}>
                                                <div className='flex items-center gap-2'>
                                                    <Box className='h-3 w-3 sm:h-4 sm:w-4 text-purple-500' />
                                                    Модель номи
                                                </div>
                                                <button
                                                    type='button'
                                                    onClick={() => {
                                                        setScanningFor('model')
                                                        setShowScanner(true)
                                                    }}
                                                    className='flex items-center gap-1 px-2 py-1 text-xs rounded-lg bg-purple-500 hover:bg-purple-600 text-white transition-colors'
                                                >
                                                    <QrCode className='h-3 w-3' />
                                                    Сканер
                                                </button>
                                            </label>
                                            <div className='relative'>
                                                <input
                                                    type='text'
                                                    value={newVariant.model}
                                                    onChange={e => setNewVariant({ ...newVariant, model: e.target.value })}
                                                    className={`w-full border-2 rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 text-sm ${inputBg} focus:ring-2 focus:ring-purple-500 focus:border-purple-500`}
                                                    placeholder='Модель номи (масалан: Air Max 270)'
                                                    required
                                                />
                                                {newVariant.model && (
                                                    <button
                                                        type='button'
                                                        onClick={() => setNewVariant({ ...newVariant, model: '' })}
                                                        className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
                                                    >
                                                        <X className='h-4 w-4' />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {/* Color Selection */}
                                        <div className='mb-4 sm:mb-6' ref={colorPickerRef}>
                                            <label className={`text-sm font-semibold ${textMuted} block mb-2 sm:mb-3 flex items-center gap-2`}>
                                                <Palette className='h-3 w-3 sm:h-4 sm:w-4' />
                                                Ранг
                                            </label>
                                            <div className='relative'>
                                                <button
                                                    type='button'
                                                    onClick={() => setShowColorPicker(!showColorPicker)}
                                                    className={`w-full flex items-center justify-between border-2 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4 ${inputBg} ${hoverBg} transition-all duration-300`}
                                                >
                                                    <div className='flex items-center gap-2 sm:gap-4'>
                                                        {newVariant.color ? (
                                                            <>
                                                                <div
                                                                    className='h-6 w-6 sm:h-8 sm:w-8 rounded-full border shadow'
                                                                    style={{
                                                                        backgroundColor: COLOR_PALETTE.find(c => c.name === newVariant.color)?.value || '#000000',
                                                                        borderColor: '#D1D5DB'
                                                                    }}
                                                                />
                                                                <span className={`font-semibold ${textColor} text-sm sm:text-base`}>{newVariant.color}</span>
                                                            </>
                                                        ) : (
                                                            <span className={`${textMuted} text-sm sm:text-base`}>Рангни танланг...</span>
                                                        )}
                                                    </div>
                                                    <Palette className={`h-4 w-4 sm:h-5 sm:w-5 ${textMuted}`} />
                                                </button>

                                                <AnimatePresence>
                                                    {showColorPicker && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            className={`absolute z-20 top-full left-0 right-0 mt-2 rounded-xl sm:rounded-2xl border-2 shadow-2xl ${dropdownBg} ${borderColor} p-3 sm:p-4`}
                                                        >
                                                            <div className='grid grid-cols-4 sm:grid-cols-4 gap-2 sm:gap-3'>
                                                                {COLOR_PALETTE.map((color, index) => (
                                                                    <button
                                                                        key={index}
                                                                        onClick={() => selectColor(color)}
                                                                        className='group relative flex flex-col items-center'
                                                                    >
                                                                        <div className='h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl border-2 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg'
                                                                            style={{
                                                                                backgroundColor: color.value,
                                                                                borderColor: newVariant.color === color.name
                                                                                    ? '#8B5CF6'
                                                                                    : '#E5E7EB'
                                                                            }}
                                                                        >
                                                                            {newVariant.color === color.name && (
                                                                                <div className='h-full w-full flex items-center justify-center'>
                                                                                    <Check className='h-4 w-4 sm:h-5 sm:w-5 text-white drop-shadow-lg' />
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <span className={`text-xs font-medium mt-1 sm:mt-2 ${textMuted}`}>
                                                                            {color.name}
                                                                        </span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                            <div className='mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200'>
                                                                <input
                                                                    type='text'
                                                                    value={newVariant.color}
                                                                    onChange={(e) => setNewVariant({ ...newVariant, color: e.target.value })}
                                                                    placeholder='Ёки янги ранг номи...'
                                                                    className={`w-full border-2 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-sm ${inputBg} focus:ring-2 focus:ring-purple-500 focus:border-purple-500`}
                                                                />
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        {/* Size Selection */}
                                        <div className='mb-4 sm:mb-6' ref={sizeDropdownRef}>
                                            <label className={`text-sm font-semibold ${textMuted} block mb-2 sm:mb-3 flex items-center gap-2`}>
                                                <Ruler className='h-3 w-3 sm:h-4 sm:w-4' />
                                                Ўлчов
                                            </label>
                                            <div className='relative'>
                                                <button
                                                    type='button'
                                                    onClick={() => setShowSizeDropdown(!showSizeDropdown)}
                                                    className={`w-full flex items-center justify-between border-2 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4 ${inputBg} ${hoverBg} transition-all duration-300`}
                                                >
                                                    <span className={newVariant.size ? `font-semibold ${textColor} text-sm sm:text-base` : `${textMuted} text-sm sm:text-base`}>
                                                        {newVariant.size || 'Ўлчовни танланг...'}
                                                    </span>
                                                    <svg className={`h-4 w-4 sm:h-5 sm:w-5 ${textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>

                                                <AnimatePresence>
                                                    {showSizeDropdown && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            className={`absolute z-20 top-full left-0 right-0 mt-2 max-h-60 sm:max-h-80 overflow-y-auto rounded-xl sm:rounded-2xl border-2 shadow-2xl ${dropdownBg} ${borderColor}`}
                                                        >
                                                            <div className='p-2 sm:p-3'>
                                                                <div className='grid grid-cols-3 sm:grid-cols-3 gap-1 sm:gap-2'>
                                                                    {SIZE_OPTIONS.map((size, index) => (
                                                                        <button
                                                                            key={index}
                                                                            onClick={() => selectSize(size)}
                                                                            className={`px-2 sm:px-3 py-2 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-300 ${newVariant.size === size
                                                                                ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                                                                                : `${hoverBg} ${textColor}`
                                                                                }`}
                                                                        >
                                                                            {size}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        {/* Style Selection */}
                                        <div className='mb-4 sm:mb-6' ref={styleDropdownRef}>
                                            <label className={`text-sm font-semibold ${textMuted} block mb-2 sm:mb-3 flex items-center gap-2`}>
                                                <Layers className='h-3 w-3 sm:h-4 sm:w-4' />
                                                Стил
                                            </label>
                                            <div className='relative'>
                                                <button
                                                    type='button'
                                                    onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                                                    className={`w-full flex items-center justify-between border-2 rounded-xl sm:rounded-2xl px-3 sm:px-5 py-3 sm:py-4 ${inputBg} ${hoverBg} transition-all duration-300`}
                                                >
                                                    <span className={`font-semibold ${textColor} text-sm sm:text-base`}>
                                                        {STYLE_OPTIONS.find(s => s.value === newVariant.style)?.label || 'Классик'}
                                                    </span>
                                                    <svg className={`h-4 w-4 sm:h-5 sm:w-5 ${textMuted}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>

                                                <AnimatePresence>
                                                    {showStyleDropdown && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                            className={`absolute z-20 top-full left-0 right-0 mt-2 max-h-60 sm:max-h-80 overflow-y-auto rounded-xl sm:rounded-2xl border-2 shadow-2xl ${dropdownBg} ${borderColor}`}
                                                        >
                                                            <div className='p-2 sm:p-3'>
                                                                {STYLE_OPTIONS.map((style, index) => (
                                                                    <button
                                                                        key={index}
                                                                        onClick={() => selectStyle(style)}
                                                                        className={`w-full text-left px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl mb-1 sm:mb-2 last:mb-0 transition-all duration-300 ${newVariant.style === style.value
                                                                            ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                                                                            : `${hoverBg} ${textColor}`
                                                                            }`}
                                                                    >
                                                                        {style.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>

                                        {/* Quantity Input */}
                                        <div className='mb-6 sm:mb-8'>
                                            <label className={`text-sm font-semibold ${textMuted} block mb-2 sm:mb-3`}>
                                                Дона сони
                                            </label>
                                            <div className='relative'>
                                                <input
                                                    type='number'
                                                    min='0'
                                                    value={newVariant.count}
                                                    onChange={e => setNewVariant({ ...newVariant, count: Math.max(0, parseInt(e.target.value) || 0) })}
                                                    className={`w-full border-2 rounded-xl sm:rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-base sm:text-lg font-bold ${inputBg} pr-20 sm:pr-24 focus:ring-2 focus:ring-purple-500 focus:border-purple-500`}
                                                    placeholder='0'
                                                />
                                                <div className='absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-1 sm:gap-2'>
                                                    <button
                                                        type='button'
                                                        onClick={() => setNewVariant({ ...newVariant, count: Math.max(0, (newVariant.count || 0) - 1) })}
                                                        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gray-200 hover:bg-gray-300 transition-colors`}
                                                    >
                                                        <span className='h-3 w-3 sm:h-4 sm:w-4 flex items-center justify-center font-bold'>-</span>
                                                    </button>
                                                    <button
                                                        type='button'
                                                        onClick={() => setNewVariant({ ...newVariant, count: (newVariant.count || 0) + 1 })}
                                                        className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-gray-200 hover:bg-gray-300 transition-colors`}
                                                    >
                                                        <span className='h-3 w-3 sm:h-4 sm:w-4 flex items-center justify-center font-bold'>+</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Add Button */}
                                        <button
                                            onClick={handleAddVariant}
                                            disabled={!newVariant.model || !newVariant.color || !newVariant.size}
                                            className='w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl transform hover:-translate-y-1 flex items-center justify-center gap-2 sm:gap-3'
                                        >
                                            <Plus className='h-5 w-5 sm:h-6 sm:w-6' />
                                            Вариация қўшиш
                                        </button>
                                    </div>

                                    {/* Mobile Add Button for small screens */}
                                    <div className='lg:hidden mt-4'>
                                        <button
                                            onClick={handleAddVariant}
                                            disabled={!newVariant.model || !newVariant.color || !newVariant.size}
                                            className='w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-xl hover:shadow-2xl flex items-center justify-center gap-3'
                                        >
                                            <Plus className='h-6 w-6' />
                                            Вариация қўшиш
                                        </button>
                                    </div>

                                    {/* Statistics Card */}
                                    <div className={`hidden lg:block mt-6 rounded-3xl p-6 bg-gray-50 border border-gray-200 shadow-xl`}>
                                        <h4 className={`text-sm font-semibold mb-4 ${textMuted} uppercase tracking-wider flex items-center gap-2`}>
                                            <div className='p-1.5 rounded-lg bg-gray-200'>
                                                <Layers className='h-4 w-4' />
                                            </div>
                                            Статистика
                                        </h4>
                                        <div className='space-y-4'>
                                            {[
                                                { label: 'Жами вариациялар', value: totalVariants, color: 'text-purple-600', icon: '📊' },
                                                { label: 'Умумий дона', value: totalStock, color: 'text-green-600', icon: '📦' },
                                                { label: 'Расмлар сони', value: totalImages, color: 'text-blue-600', icon: '🖼️' },
                                                { label: 'Ўртача дона', value: totalVariants > 0 ? Math.round(totalStock / totalVariants) : 0, color: textColor, icon: '⚖️' }
                                            ].map((stat, index) => (
                                                <div key={index} className='flex justify-between items-center p-3 rounded-xl bg-gray-100/50'>
                                                    <div className='flex items-center gap-3'>
                                                        <span className='text-xl'>{stat.icon}</span>
                                                        <span className={textMuted}>{stat.label}</span>
                                                    </div>
                                                    <span className={`text-lg font-bold ${stat.color}`}>
                                                        {stat.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Content - Variants Display */}
                                <div className='flex-1 overflow-hidden flex flex-col'>
                                    {/* View Toggle and Actions - Mobile simplified */}
                                    <div className={`border-b ${borderColor} px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0`}>
                                        <h3 className={`text-lg sm:text-xl font-bold ${textColor} flex items-center gap-2 sm:gap-3`}>
                                            <Layers className='h-5 w-5 sm:h-6 sm:w-6 text-purple-500' />
                                            Вариациялар рўйхати
                                            <span className='text-xs sm:text-sm font-normal px-2 sm:px-3 py-1 rounded-full bg-purple-500/10 text-purple-500'>
                                                {totalVariants} та
                                            </span>
                                        </h3>
                                        <div className='flex items-center gap-2'>
                                            <button
                                                onClick={() => {
                                                    if (variants.length === 0) return
                                                    const sorted = [...variants].sort((a, b) => (b.count || 0) - (a.count || 0))
                                                    setVariants(sorted)
                                                }}
                                                className={`px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium ${hoverBg} ${textColor} flex items-center gap-2 transition-all hover:scale-105`}
                                            >
                                                <RefreshCw className='h-3 w-3 sm:h-4 sm:w-4' />
                                                Тартиблаш
                                            </button>
                                        </div>
                                    </div>

                                    {/* Variants List/Grid */}
                                    <div className='flex-1 overflow-y-auto p-4 sm:p-6'>
                                        {variants.length === 0 ? (
                                            <div className='h-full flex flex-col items-center justify-center py-12 sm:py-0'>
                                                <div className='relative mb-6'>
                                                    <div className='absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-2xl opacity-20'></div>
                                                    <div className='relative p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-gray-100 to-gray-200'>
                                                        <Layers className='h-16 w-16 sm:h-20 sm:w-20 text-gray-400' />
                                                    </div>
                                                </div>
                                                <h4 className={`text-xl sm:text-2xl font-bold mb-3 ${textColor} text-center`}>
                                                    Вариациялар мавжуд эмас
                                                </h4>
                                                <p className={`text-base sm:text-lg ${textMuted} max-w-md text-center mb-8`}>
                                                    Биринчи вариацияни қўшиш учун қўшиш формасини тўлдиринг
                                                </p>
                                            </div>
                                        ) : (
                                            // List View (always for mobile)
                                            <div className='space-y-4'>
                                                {variants.map((variant, index) => (
                                                    <motion.div
                                                        key={index}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: index * 0.05 }}
                                                        draggable
                                                        onDragStart={(e) => handleDragStart(e, index)}
                                                        onDragOver={(e) => handleDragOver(e, index)}
                                                        onDrop={(e) => handleDrop(e, index)}
                                                        onDragEnd={handleDragEnd}
                                                        className={`rounded-xl sm:rounded-2xl border-2 transition-all duration-300 ${draggingIndex === index
                                                            ? 'border-purple-500 bg-purple-500/10 scale-105'
                                                            : draggingOverIndex === index
                                                                ? 'border-green-500 bg-green-500/10'
                                                                : `${borderColor} ${cardBg}`
                                                            } p-4 sm:p-6 cursor-move group hover:shadow-lg sm:hover:shadow-2xl hover:-translate-y-1`}
                                                    >
                                                        <div className='flex flex-col sm:flex-row sm:items-start justify-between gap-4'>
                                                            {/* Variant Main Info */}
                                                            <div className='flex-1'>
                                                                {/* Model Info */}
                                                                <div className='mb-4'>
                                                                    <div className='flex items-center gap-2 mb-2'>
                                                                        <Box className='h-4 w-4 text-purple-500' />
                                                                        <h4 className={`font-bold ${textColor}`}>{variant.model || 'Модельсиз'}</h4>
                                                                    </div>
                                                                </div>

                                                                <div className='flex items-center gap-3 mb-4 flex-wrap'>
                                                                    {/* Color Badge */}
                                                                    <div className='flex items-center gap-2'>
                                                                        <div
                                                                            className='h-8 w-8 rounded-lg border shadow'
                                                                            style={{
                                                                                backgroundColor: COLOR_PALETTE.find(c => c.name === variant.color)?.value || '#000000',
                                                                                borderColor: '#D1D5DB'
                                                                            }}
                                                                        />
                                                                        <div>
                                                                            <p className={`text-sm font-semibold ${textColor}`}>{variant.color}</p>
                                                                            <p className={`text-xs ${textMuted}`}>Ранг</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Size Badge */}
                                                                    <div className='flex items-center gap-2'>
                                                                        <div className='h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow'>
                                                                            <Ruler className='h-4 w-4 text-white' />
                                                                        </div>
                                                                        <div>
                                                                            <p className={`text-sm font-semibold ${textColor}`}>{variant.size}</p>
                                                                            <p className={`text-xs ${textMuted}`}>Ўлчов</p>
                                                                        </div>
                                                                    </div>

                                                                    {/* Quantity Badge */}
                                                                    <div className='flex items-center gap-2'>
                                                                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shadow ${variant.count > 0 ? 'bg-green-500' : 'bg-red-500'}`}>
                                                                            <span className='text-white font-bold text-sm'>{variant.count || 0}</span>
                                                                        </div>
                                                                        <div>
                                                                            <p className={`text-sm font-semibold ${variant.count > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                                {variant.count || 0} дона
                                                                            </p>
                                                                            <p className={`text-xs ${textMuted}`}>Сони</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Quantity and Images */}
                                                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6'>
                                                                    {/* Quantity Control */}
                                                                    <div>
                                                                        <label className={`text-sm font-semibold ${textMuted} block mb-2`}>
                                                                            Дона сони
                                                                        </label>
                                                                        <div className='flex items-center gap-3'>
                                                                            <div className='relative'>
                                                                                <input
                                                                                    type='number'
                                                                                    min='0'
                                                                                    value={variant.count || 0}
                                                                                    onChange={e => handleUpdateVariant(index, 'count', Math.max(0, parseInt(e.target.value) || 0))}
                                                                                    className={`w-32 sm:w-40 border-2 rounded-lg sm:rounded-xl px-4 py-2 sm:px-5 sm:py-3 text-lg sm:text-xl font-bold ${inputBg} focus:ring-2 focus:ring-purple-500 focus:border-purple-500`}
                                                                                />
                                                                                <div className='absolute right-2 top-1/2 transform -translate-y-1/2 flex flex-col gap-1'>
                                                                                    <button
                                                                                        onClick={() => handleUpdateVariant(index, 'count', Math.max(0, (variant.count || 0) + 1))}
                                                                                        className={`p-1 rounded-md bg-gray-200 hover:bg-gray-300`}
                                                                                    >
                                                                                        <Plus className='h-2 w-2 sm:h-3 sm:w-3' />
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleUpdateVariant(index, 'count', Math.max(0, (variant.count || 0) - 1))}
                                                                                        className={`p-1 rounded-md bg-gray-200 hover:bg-gray-300`}
                                                                                    >
                                                                                        <span className='h-2 w-2 sm:h-3 sm:w-3 flex items-center justify-center'>-</span>
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                            <span className={`text-sm ${textMuted}`}>дона</span>
                                                                        </div>
                                                                    </div>

                                                                    {/* Images */}
                                                                    <div>
                                                                        <div className='flex items-center justify-between mb-2'>
                                                                            <label className={`text-sm font-semibold ${textMuted} flex items-center gap-2`}>
                                                                                <ImageIcon className='h-3 w-3 sm:h-4 sm:w-4' />
                                                                                Расмлар ({variant.images?.length || 0})
                                                                            </label>
                                                                            <label className={`text-xs sm:text-sm font-medium text-purple-600 hover:text-purple-700 cursor-pointer flex items-center gap-1 sm:gap-2 transition-all hover:scale-105`}>
                                                                                <Upload className='h-3 w-3 sm:h-4 sm:w-4' />
                                                                                Қўшиш
                                                                                <input
                                                                                    type='file'
                                                                                    accept='image/*'
                                                                                    multiple
                                                                                    onChange={(e) => handleImageUpload(e, index)}
                                                                                    className='hidden'
                                                                                    ref={fileInputRef}
                                                                                />
                                                                            </label>
                                                                        </div>

                                                                        {variant.images && variant.images.length > 0 ? (
                                                                            <div className='flex flex-wrap gap-2 sm:gap-3'>
                                                                                {variant.images.map((img, imgIndex) => (
                                                                                    <div key={imgIndex} className='relative group/image'>
                                                                                        <div className='h-16 w-16 sm:h-20 sm:w-20 rounded-lg sm:rounded-xl overflow-hidden border border-transparent group-hover/image:border-purple-500 transition-all duration-300 shadow'>
                                                                                            <img
                                                                                                src={img}
                                                                                                alt={`${variant.model} ${variant.color} ${variant.size} - ${imgIndex + 1}`}
                                                                                                className='w-full h-full object-cover cursor-pointer hover:scale-110 transition-transform duration-300'
                                                                                                onClick={() => {
                                                                                                    setPreviewIndex(imgIndex)
                                                                                                    setImagePreview(img)
                                                                                                }}
                                                                                            />
                                                                                        </div>

                                                                                        {/* Image Actions Overlay - Simplified for mobile */}
                                                                                        <div className='absolute inset-0 bg-black/70 opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 rounded-lg sm:rounded-xl flex items-center justify-center gap-1'>
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setPreviewIndex(imgIndex)
                                                                                                    setImagePreview(img)
                                                                                                }}
                                                                                                className='p-1 sm:p-2 bg-white/20 hover:bg-white/30 rounded-md sm:rounded-xl transition-colors'
                                                                                                title='Кўриш'
                                                                                            >
                                                                                                <Eye className='h-3 w-3 sm:h-4 sm:w-4 text-white' />
                                                                                            </button>
                                                                                            <button
                                                                                                onClick={() => handleRemoveImage(index, imgIndex)}
                                                                                                className='p-1 sm:p-2 bg-red-500/80 hover:bg-red-600 rounded-md sm:rounded-xl transition-colors'
                                                                                                title='Ўчириш'
                                                                                            >
                                                                                                <Trash2 className='h-3 w-3 sm:h-4 sm:w-4 text-white' />
                                                                                            </button>
                                                                                        </div>

                                                                                        {/* Image Number Badge */}
                                                                                        <div className='absolute top-1 right-1 bg-black/60 text-white text-xs px-1 py-0.5 rounded-full'>
                                                                                            {imgIndex + 1}
                                                                                        </div>
                                                                                    </div>
                                                                                ))}

                                                                                {/* Add More Button */}
                                                                                <label className='h-16 w-16 sm:h-20 sm:w-20 rounded-lg sm:rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all duration-300 group/add'>
                                                                                    {uploadProgress[index] ? (
                                                                                        <>
                                                                                            <Loader2 className='h-5 w-5 sm:h-6 sm:w-6 animate-spin text-gray-400 mb-1' />
                                                                                            <div className='w-12 h-1 bg-gray-200 rounded-full overflow-hidden'>
                                                                                                <div
                                                                                                    className='h-full bg-purple-500 transition-all duration-300'
                                                                                                    style={{ width: `${uploadProgress[index]}%` }}
                                                                                                ></div>
                                                                                            </div>
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <Plus className='h-5 w-5 sm:h-6 sm:w-6 text-gray-400 mb-1 group-hover/add:text-purple-500 transition-colors' />
                                                                                            <span className='text-xs text-gray-400 group-hover/add:text-purple-500'>Янги</span>
                                                                                        </>
                                                                                    )}
                                                                                    <input
                                                                                        type='file'
                                                                                        accept='image/*'
                                                                                        multiple
                                                                                        onChange={(e) => handleImageUpload(e, index)}
                                                                                        className='hidden'
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                        ) : (
                                                                            <label className='h-24 sm:h-32 rounded-lg sm:rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer hover:border-purple-500 hover:bg-purple-50/50 transition-all duration-300 group/none'>
                                                                                {imageUploading ? (
                                                                                    <>
                                                                                        <Loader2 className='h-8 w-8 sm:h-10 sm:w-10 animate-spin text-gray-400 mb-2 sm:mb-3' />
                                                                                        <span className='text-sm text-gray-400'>Юкланмоқда...</span>
                                                                                    </>
                                                                                ) : (
                                                                                    <>
                                                                                        <Camera className='h-8 w-8 sm:h-10 sm:w-10 text-gray-400 mb-2 sm:mb-3 group-hover/none:text-purple-500' />
                                                                                        <span className='text-sm sm:text-base text-gray-400 group-hover/none:text-purple-500'>Расм юклаш</span>
                                                                                        <input
                                                                                            type='file'
                                                                                            accept='image/*'
                                                                                            multiple
                                                                                            onChange={(e) => handleImageUpload(e, index)}
                                                                                            className='hidden'
                                                                                        />
                                                                                    </>
                                                                                )}
                                                                            </label>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Remove Button - Mobile positioned differently */}
                                                            <div className='self-end sm:self-start sm:ml-4'>
                                                                <button
                                                                    onClick={() => handleRemoveVariant(index)}
                                                                    className={`p-2 sm:p-3 rounded-lg sm:rounded-xl bg-red-100 hover:bg-red-200 transition-all duration-300 hover:scale-110`}
                                                                    title='Ўчириш'
                                                                >
                                                                    <Trash2 className='h-5 w-5 sm:h-6 sm:w-6 text-red-500' />
                                                                </button>
                                                            </div>
                                                        </div>

                                                        {/* Drag Handle - Mobile simplified */}
                                                        <div className='flex items-center justify-between mt-4 pt-4 border-t border-gray-200'>
                                                            <div className='flex items-center gap-2'>
                                                                <div className='p-1.5 rounded-md bg-gray-200'>
                                                                    <Grid3x3 className='h-3 w-3 text-gray-400' />
                                                                </div>
                                                                <span className='text-xs text-gray-400'>Тортаб ташланг</span>
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Fixed Bottom Bar - Mobile optimized */}
                            <div className={`sticky bottom-0 border-t ${borderColor} px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center bg-white/90 backdrop-blur-lg shadow-lg sm:shadow-2xl gap-3 sm:gap-0`}>
                                <div className='flex items-center gap-3 order-2 sm:order-1'>
                                    <div className={`text-xs sm:text-sm ${textMuted} flex items-center gap-2`}>
                                        <div className='h-2 w-2 rounded-full bg-green-500 animate-pulse'></div>
                                        Онлайн
                                    </div>
                                    <div className={`text-xs sm:text-sm ${textMuted} hidden sm:block`}>
                                        Ишлаб чиқарувчи: {user.firstName} {user.lastName}
                                    </div>
                                </div>
                                <div className='flex items-center gap-3 order-1 sm:order-2 w-full sm:w-auto'>
                                    <button
                                        onClick={() => {
                                            if (variants.length > 0 && !confirm('Барча ўзгаришларни йўқотишни хоҳлайсизми?')) return
                                            setOpen(false)
                                        }}
                                        className={`flex-1 sm:flex-none px-4 sm:px-8 py-2.5 sm:py-3 rounded-lg sm:rounded-2xl font-semibold text-base sm:text-lg transition-all duration-300 bg-gray-200 hover:bg-gray-300 text-gray-800 hover:scale-105 shadow hover:shadow-lg`}
                                    >
                                        Бекор қилиш
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={loading}
                                        className='flex-1 sm:flex-none flex items-center justify-center gap-2 sm:gap-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 sm:px-10 py-2.5 sm:py-3 rounded-lg sm:rounded-2xl font-bold text-base sm:text-lg hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl'
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className='h-4 w-4 sm:h-5 sm:w-5 animate-spin' />
                                                <span className='text-sm sm:text-base'>Сақлаш</span>
                                            </>
                                        ) : (
                                            <>
                                                <Save className='h-4 w-4 sm:h-5 sm:w-5' />
                                                <span className='text-sm sm:text-base'>Сақлаш ({totalVariants})</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    {/* QR Scanner Modal - Mobile optimized */}
                    <AnimatePresence>
                        {showScanner && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className='fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4'
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
                                    className='relative w-full max-w-md bg-gray-900 rounded-2xl overflow-hidden shadow-2xl'
                                    onClick={e => e.stopPropagation()}
                                >
                                    <div className='p-4 bg-gradient-to-r from-blue-700 to-blue-900'>
                                        <div className='flex items-center justify-between'>
                                            <div className='flex items-center gap-2'>
                                                <Camera className='h-5 w-5 text-white' />
                                                <h3 className='text-lg font-bold text-white'>
                                                    QR код сканер
                                                </h3>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setShowScanner(false)
                                                    stopScan()
                                                }}
                                                className='p-2 hover:bg-blue-800 rounded-lg transition-colors'
                                            >
                                                <X className='h-4 w-4 text-white' />
                                            </button>
                                        </div>
                                        <p className='text-blue-200 text-xs mt-1'>
                                            Модель номи учун QR кодни камерага кўрсатинг
                                        </p>
                                    </div>

                                    <div className='p-3'>
                                        {scanError && (
                                            <div className='mb-3 p-2 bg-red-900/30 border border-red-700 rounded-lg'>
                                                <p className='text-red-300 text-xs'>{scanError}</p>
                                            </div>
                                        )}

                                        <div className='relative'>
                                            <video
                                                ref={videoRef}
                                                className='w-full h-[300px] object-cover rounded-lg'
                                                playsInline
                                                autoPlay
                                                muted
                                            />

                                            <canvas
                                                ref={canvasRef}
                                                className='hidden'
                                            />

                                            {!scanning && (
                                                <div className='absolute inset-0 flex items-center justify-center'>
                                                    <button
                                                        onClick={() => startScan('model')}
                                                        className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-medium transition-all hover:scale-105'
                                                    >
                                                        <Camera className='h-4 w-4' />
                                                        Сканерни бошлаш
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {scanResult && (
                                            <div className='mt-3 p-2 bg-green-900/30 border border-green-700 rounded-lg'>
                                                <p className='text-green-300 text-xs'>
                                                    Сканланди: <span className='font-mono break-all'>{scanResult}</span>
                                                </p>
                                                <p className='text-green-400 text-xs mt-1'>
                                                    Модель майдонга киритилди
                                                </p>
                                            </div>
                                        )}

                                        <div className='mt-3 text-center'>
                                            <p className='text-gray-400 text-xs'>
                                                Камерани QR кодга қаратинг
                                            </p>
                                        </div>
                                    </div>
                                </motion.div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Image Preview Modal - Mobile optimized */}
                    <AnimatePresence>
                        {imagePreview && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className='fixed inset-0 bg-black z-[60] flex items-center justify-center'
                                onClick={() => {
                                    setImagePreview(null)
                                    setZoomLevel(1)
                                }}
                            >
                                <div className='absolute top-4 left-4 z-10 flex items-center gap-2'>
                                    <button
                                        onClick={() => {
                                            setImagePreview(null)
                                            setZoomLevel(1)
                                        }}
                                        className='bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors'
                                    >
                                        <X className='h-5 w-5' />
                                    </button>
                                    <div className='bg-black/50 text-white px-3 py-1 rounded-full text-sm'>
                                        {previewIndex + 1} / {variants.find(v => v.images?.includes(imagePreview))?.images?.length || 1}
                                    </div>
                                </div>

                                <div className='absolute top-4 right-4 z-10 flex items-center gap-2'>
                                    <button
                                        onClick={() => setZoomLevel(Math.min(zoomLevel + 0.25, 3))}
                                        className='bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors'
                                        disabled={zoomLevel >= 3}
                                    >
                                        <ZoomIn className='h-4 w-4' />
                                    </button>
                                    <button
                                        onClick={() => setZoomLevel(Math.max(zoomLevel - 0.25, 0.5))}
                                        className='bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors'
                                        disabled={zoomLevel <= 0.5}
                                    >
                                        <ZoomOut className='h-4 w-4' />
                                    </button>
                                </div>

                                {/* Navigation Buttons */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const variantIndex = variants.findIndex(v => v.images?.includes(imagePreview))
                                        if (variantIndex !== -1) {
                                            navigatePreview('prev', previewIndex, variantIndex)
                                        }
                                    }}
                                    className='absolute left-2 sm:left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-colors'
                                >
                                    <ChevronLeft className='h-5 w-5 sm:h-6 sm:w-6' />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        const variantIndex = variants.findIndex(v => v.images?.includes(imagePreview))
                                        if (variantIndex !== -1) {
                                            navigatePreview('next', previewIndex, variantIndex)
                                        }
                                    }}
                                    className='absolute right-2 sm:right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition-colors'
                                >
                                    <ChevronRight className='h-5 w-5 sm:h-6 sm:w-6' />
                                </button>

                                {/* Image */}
                                <motion.div
                                    ref={imagePreviewRef}
                                    initial={{ scale: 0.9 }}
                                    animate={{ scale: 1 }}
                                    exit={{ scale: 0.9 }}
                                    className='relative w-full h-full flex items-center justify-center px-2'
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <img
                                        src={imagePreview}
                                        alt='Preview'
                                        className='max-w-full max-h-[80vh] object-contain rounded-lg'
                                        style={{
                                            transform: `scale(${zoomLevel})`,
                                            transition: 'transform 0.3s ease'
                                        }}
                                    />
                                </motion.div>

                                {/* Zoom Level Indicator */}
                                <div className='absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm'>
                                    {Math.round(zoomLevel * 100)}%
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </>
            )}
        </AnimatePresence>
    )
}

export default VariantManagerModal