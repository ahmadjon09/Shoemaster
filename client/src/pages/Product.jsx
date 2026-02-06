import { useState, useContext, useEffect, useMemo, useRef } from 'react'
import useSWR from 'swr'
import dayjs from "dayjs";
import {
  Boxes,
  Loader2,
  Plus,
  Save,
  Eye,
  Tag,
  Package,
  Calendar,
  CheckCircle,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Image as ImageIcon,
  Edit,
  BarChart3,
  ShoppingBag,
  Upload,
  X,
  AlertCircle,
  Check,
  RefreshCw,
  Calculator
} from 'lucide-react'
import Fetch from '../middlewares/fetcher'
import AddProductModal from '../components/AddProductModal'
import { ContextData } from '../contextData/Context'
import { LoadingState } from '../components/loading-state'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../assets/js/i';

export const ProductsPage = () => {
  const { user } = useContext(ContextData)
  const fileInputRef = useRef(null)

  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchField, setSearchField] = useState('title')
  const [category, setCategory] = useState('')
  const [type, setType] = useState('all')
  const [searchDate, setSearchDate] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')

  const [open, setOpen] = useState(false)
  const [viewData, setViewData] = useState(null)
  const [editing, setEditing] = useState({})
  const [loading, setLoading] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [previewImages, setPreviewImages] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);


  // Rasm boshqarish state'lari
  const [uploadingImages, setUploadingImages] = useState({})
  const [removingImages, setRemovingImages] = useState({})
  const [localImagePreviews, setLocalImagePreviews] = useState({})
  const [selectedFiles, setSelectedFiles] = useState({})
  const [uploadProgress, setUploadProgress] = useState({})

  // Rasm o'zgartirish uchun alohida state
  const [imageChanges, setImageChanges] = useState({})

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [search])

  const apiEndpoint = useMemo(() => {
    const params = new URLSearchParams()
    params.append('page', page)
    params.append('limit', 50)
    params.append('search', debouncedSearch || '')
    params.append('searchField', searchField)
    if (category) params.append('category', category)
    if (searchDate) params.append('date', searchDate)
    if (type) params.append('type', type)
    return `/products?${params.toString()}`
  }, [page, debouncedSearch, searchField, category, type, searchDate])

  const { data, error, isLoading, mutate } = useSWR(apiEndpoint, Fetch, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    keepPreviousData: true
  })

  const calculateTotalStock = (product) => {
    return product.count || 0
  }

  const handleChange = (id, field, value) => {
    setEditing(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }))
  }

  const handleSave = async id => {
    try {
      setLoading(id)

      // Asosiy ma'lumotlarni tayyorlash
      const updateData = {
        title: editing[id]?.title || viewData?.title,
        category: editing[id]?.category || viewData?.category,
        gender: editing[id]?.gender || viewData?.gender,
        season: editing[id]?.season || viewData?.season,
        material: editing[id]?.material || viewData?.material,
        sku: editing[id]?.sku || viewData?.sku,
        count: editing[id]?.count || viewData?.count
      }

      // Agar rasmlar o'zgartirilgan bo'lsa, ularni ham qo'shamiz
      if (imageChanges[id]) {
        updateData.mainImages = imageChanges[id].mainImages
      }

      await Fetch.put(`/products/${id}`, updateData)

      // Editing state'ni tozalash
      setEditing(prev => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })

      // Image changes state'ni tozalash
      setImageChanges(prev => {
        const copy = { ...prev }
        delete copy[id]
        return copy
      })

      // View data'ni yangilash
      if (viewData && viewData._id === id) {
        setViewData(prev => ({
          ...prev,
          ...updateData
        }))
      }

      // Mutate bilan yangilash
      mutate()

      // Muvaffaqiyat xabari
      alert('✅ Маҳсулот муваффақиятли сақланди')

    } catch (err) {
      console.error('Update error:', err)
      alert('❌ Сақлашда хатолик юз берди')
    } finally {
      setLoading(null)
      setViewData(null)
    }
  }

  // Tahriqlashni bekor qilish funksiyasi
  const handleCancelEditing = (id) => {
    setEditing(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })

    setImageChanges(prev => {
      const copy = { ...prev }
      delete copy[id]
      return copy
    })

    // Agar local preview lar bo'lsa, tozalash
    if (localImagePreviews[id]) {
      localImagePreviews[id].forEach(url => URL.revokeObjectURL(url))
      setLocalImagePreviews(prev => {
        const newPreviews = { ...prev }
        delete newPreviews[id]
        return newPreviews
      })
    }

    setSelectedFiles(prev => {
      const newFiles = { ...prev }
      delete newFiles[id]
      return newFiles
    })
  }

  const handleDelete = async (id) => {
    try {
      setDeleting(id)
      await Fetch.delete(`/products/${id}`)
      mutate()
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Delete error:', err)
      alert('❌ Ўчиришда хатолик юз берди')
    } finally {
      setDeleting(null)
    }
  }

  // Rasm Yuklash Handler - ImgBB ga yuklash
  const handleImageUpload = async (productId, files) => {
    try {
      setUploadingImages(prev => ({ ...prev, [productId]: true }))

      const fileArray = Array.from(files)
      const uploadedUrls = []
      let successfulUploads = 0

      // Progress yangilash
      setUploadProgress(prev => ({
        ...prev,
        [productId]: {
          total: fileArray.length,
          completed: 0,
          current: 0
        }
      }))

      // Har bir faylni alohida yuklash
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i]

        try {
          // Progress yangilash
          setUploadProgress(prev => ({
            ...prev,
            [productId]: {
              ...prev[productId],
              current: i + 1
            }
          }))

          // ImgBB ga yuklash
          const url = await uploadImage(file)
          uploadedUrls.push(url)
          successfulUploads++

          // Progress yangilash
          setUploadProgress(prev => ({
            ...prev,
            [productId]: {
              ...prev[productId],
              completed: i + 1
            }
          }))

        } catch (error) {
          console.error(`Rasm yuklashda xatolik (${file.name}):`, error)
          setUploadProgress(prev => ({
            ...prev,
            [productId]: {
              ...prev[productId],
              completed: i + 1
            }
          }))
          continue
        }
      }

      if (uploadedUrls.length > 0) {
        // Image changes state'ga qo'shamiz
        const currentImages = viewData?.mainImages || []
        const newImages = [...currentImages, ...uploadedUrls]

        setImageChanges(prev => ({
          ...prev,
          [productId]: {
            ...prev[productId],
            mainImages: newImages
          }
        }))

        // View data'ni yangilash
        if (viewData && viewData._id === productId) {
          setViewData(prev => ({
            ...prev,
            mainImages: newImages
          }))
        }

        // Local previewlarni tozalash
        if (localImagePreviews[productId]) {
          localImagePreviews[productId].forEach(url => URL.revokeObjectURL(url))
          setLocalImagePreviews(prev => {
            const newPreviews = { ...prev }
            delete newPreviews[productId]
            return newPreviews
          })
        }

        setSelectedFiles(prev => {
          const newFiles = { ...prev }
          delete newFiles[productId]
          return newFiles
        })

        // Muvaffaqiyat xabari
        if (successfulUploads === fileArray.length) {
          alert(`✅ Барча ${successfulUploads} та расм муваффақиятли юкланди`)
        } else {
          alert(`✅ ${successfulUploads} та расм юкланди, ${fileArray.length - successfulUploads} тасида хатолик`)
        }
      }

      // Progressni tozalash
      setUploadProgress(prev => {
        const newProgress = { ...prev }
        delete newProgress[productId]
        return newProgress
      })

    } catch (err) {
      console.error('Umumiy xatolik:', err)
      alert('❌ Расм юклашда хатолик юз берди')
    } finally {
      setUploadingImages(prev => ({ ...prev, [productId]: false }))
    }
  }

  // Rasm o'chirish Handler - local state'da o'chirish
  const handleImageRemove = (productId, imageUrl) => {
    try {
      setRemovingImages(prev => ({ ...prev, [imageUrl]: true }))

      // Hozirgi rasmlarni filter qilish
      const currentImages = viewData?.mainImages || []
      const updatedImages = currentImages.filter(img => img !== imageUrl)

      // Image changes state'ga saqlaymiz
      setImageChanges(prev => ({
        ...prev,
        [productId]: {
          ...prev[productId],
          mainImages: updatedImages
        }
      }))

      // View data'ni yangilash
      if (viewData && viewData._id === productId) {
        setViewData(prev => ({
          ...prev,
          mainImages: updatedImages
        }))
      }

      alert('✅ Расм ўчирилди (ҳали сақланмаган)')
    } catch (err) {
      console.error('Image remove error:', err)
      alert('❌ Расм ўчиришда хатолик юз берди')
    } finally {
      setRemovingImages(prev => ({ ...prev, [imageUrl]: false }))
    }
  }

  // uploadImage funksiyasi - ImgBB ga yuklash
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

  // Fayl tanlash handler bilan preview
  const handleFileSelect = (productId, event) => {
    const files = event.target.files
    if (!files.length) return

    setSelectedFiles(prev => ({ ...prev, [productId]: files }))

    // Preview URL'larini yaratish
    const previewUrls = []
    for (let i = 0; i < Math.min(files.length, 4); i++) {
      previewUrls.push(URL.createObjectURL(files[i]))
    }

    setLocalImagePreviews(prev => ({
      ...prev,
      [productId]: previewUrls
    }))
  }

  // Tanlangan fayllarni tozalash
  const clearSelectedFiles = (productId) => {
    // Object URL'larni tozalash
    if (localImagePreviews[productId]) {
      localImagePreviews[productId].forEach(url => URL.revokeObjectURL(url))
    }

    setLocalImagePreviews(prev => {
      const newPreviews = { ...prev }
      delete newPreviews[productId]
      return newPreviews
    })

    setSelectedFiles(prev => {
      const newFiles = { ...prev }
      delete newFiles[productId]
      return newFiles
    })
  }

  const handlePageChange = (newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }


  const products = data?.data?.data || []
  const pagination = data?.data.pagination || {}

  // Tarjimalar
  const categories = [
    { value: 'Ёзги', label: 'Ёзги' },
    { value: 'Баҳор-кузги', label: 'Баҳор-кузги' },
    { value: 'Қишги', label: 'Қишги' },
  ]



  // Edit mode'ni tekshirish
  const isEditMode = (productId) => {
    return !!(editing[productId] || imageChanges[productId])
  }

  const openPreview = (images, index = 0) => {
    setPreviewImages(images);
    setActiveIndex(index);
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-4 md:p-6 transition-colors duration-300">
      <div className="mx-auto space-y-4 md:space-y-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl shadow-lg p-4 md:p-6 bg-white border border-gray-200"
        >
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-2xl shadow-lg">
                <ShoppingBag className="h-6 w-6 md:h-8 md:w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                  Маҳсулотлар
                </h1>
                <p className="text-gray-600 text-sm md:text-base mt-1 flex gap-1 items-center">
                  {data?.data?.total || <Loader2 className='animate-spin' size={12} />} та маҳсулот • Умумий дона: {data?.data?.totalCount || <Loader2 className='animate-spin' size={12} />}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 md:px-6 py-2 md:py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Plus size={18} />
                <span className="font-semibold text-sm md:text-base">Янги маҳсулот</span>
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Search and Filter Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl shadow-lg p-4 md:p-6 bg-white border border-gray-200"
        >
          <div className="space-y-4">
            {/* Main Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Қидириш..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 border-gray-300"
              />
              {/* <select
                value={searchField}
                onChange={e => setSearchField(e.target.value)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 border border-gray-300 rounded-lg px-2 py-1 text-sm outline-none"
              >
                <option value="title">Номи бўйича</option>
                <option value="sku">АРТ бўйича</option>
              </select> */}
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 border-gray-300"
                >
                  <option value="">Барча категориялар</option>
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Calculator className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <select
                  value={type}
                  onChange={e => setType(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 border-gray-300"
                >
                  <option value="all">Барчаси</option>
                  <option value="in-stock">Мавжуд</option>
                  <option value="out-of-stock">Тугаган</option>
                </select>
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="date"
                  value={searchDate}
                  onChange={e => {
                    setSearchDate(e.target.value)
                    setPage(1)
                  }}
                  className="w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 border-gray-300"
                />
              </div>

              <button
                onClick={() => {
                  setSearch('')
                  setCategory('')
                  setSearchDate('')
                  setSearchField('title')
                  setType('all')
                }}
                className="w-full py-3 border rounded-xl font-medium transition-colors bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300"
              >
                <Filter size={16} className="inline mr-2" />
                Тозалаш
              </button>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        {isLoading ? (
          <div className="rounded-2xl shadow-lg p-8 md:p-12 bg-white">
            <LoadingState />
          </div>
        ) : error ? (
          <div className="rounded-2xl shadow-lg p-6 md:p-8 bg-white">
            <div className="text-center text-red-500">
              <XCircle className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-4 text-red-400" />
              <h3 className="text-lg font-semibold mb-2">Хатолик юз берди</h3>
              <p className="text-sm">{error.response?.data?.message || error.message}</p>
            </div>
          </div>
        ) : (
          <>
            {/* Destop */}
            <div className='hidden md:block'>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl shadow-lg overflow-hidden border bg-white border-gray-200"
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                          Маҳсулот
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                          Категория
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                          Омбор
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                          Сотилган
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                          Сана
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                          QR
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                          Амаллар
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products.map((product, index) => (
                        <motion.tr
                          key={product._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`hover:bg-gray-50 cursor-pointer ${product.count == 0 ? "bg-red-300 hover:bg-red-200" : ""}`}
                        >
                          {/* Product Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {product.mainImages && product.mainImages.length > 0 ? (
                                <div
                                  className="relative h-12 w-12 rounded-lg overflow-hidden">
                                  <img
                                    onClick={() => openPreview(product.mainImages, 0)}
                                    src={product.mainImages[0]}
                                    alt={product.title}
                                    className="w-full h-full object-cover cursor-pointer"
                                  />
                                </div>
                              ) : (
                                <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}

                              <div>
                                <p className="font-semibold text-gray-800">
                                  {product.title}
                                </p>
                                <p className="text-sm text-gray-600">
                                  АРТ: {product.sku}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-6 py-4" >
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {categories.find(c => c.value === product.category)?.label || product.category}
                            </span>
                          </td>

                          {/* Stock */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Package size={16} className="text-gray-600" />
                              <span className="font-semibold text-gray-800">
                                {product.count} дона
                              </span>
                            </div>
                          </td>

                          {/* Sold */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <BarChart3 size={16} className="text-green-500" />
                              <span className="font-semibold text-gray-800">
                                {product.sold || 0} дона
                              </span>
                            </div>
                          </td>

                          {/* Date */}
                          <td className="px-6 py-4">
                            {dayjs(product.createdAt).format("DD.MM.YYYY HH:mm")}
                          </td>

                          {/* QR Code */}
                          <td className="px-6 py-4">
                            <img className="w-10 h-10" src={product.qrCode} alt="qrcode" />
                          </td>

                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setViewData(product)}
                                className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                                title="Кўриш"
                              >
                                <Eye size={16} />
                              </motion.button>

                              {user.role === 'admin' && (
                                <>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setDeleteConfirm(product)}
                                    className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                                    title="Ўчириш"
                                  >
                                    <Trash2 size={16} />
                                  </motion.button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {products.length === 0 && (
                  <div className="text-center py-12">
                    <Boxes size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2 text-gray-600">
                      Маҳсулотлар топилмади
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {search || category || searchDate
                        ? 'Қидирув шартларингизга мос келувчи маҳсулотлар топилмади'
                        : 'Ҳали маҳсулот қўшилмаган'}
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="px-6 py-4 w-full flex justify-center border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page <= 1}
                          className={`p-2 rounded-lg ${page <= 1
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200'
                            } text-gray-800`}
                        >
                          <ChevronLeft size={20} />
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum
                            if (pagination.totalPages <= 5) {
                              pageNum = i + 1
                            } else if (page <= 3) {
                              pageNum = i + 1
                            } else if (page >= pagination.totalPages - 2) {
                              pageNum = pagination.totalPages - 4 + i
                            } else {
                              pageNum = page - 2 + i
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${page === pageNum
                                  ? 'bg-blue-500 text-white'
                                  : 'hover:bg-gray-200 text-gray-800'
                                  }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                        </div>

                        <button
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page >= pagination.totalPages}
                          className={`p-2 rounded-lg ${page >= pagination.totalPages
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200'
                            } text-gray-800`}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Mobile */}
            <div className='block md:hidden'>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl shadow-lg overflow-hidden border bg-white border-gray-200"
              >
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                          Маҳсулот
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                          Омбор
                        </th>
                        <th className="px-6 py-4 text-left text-sm font-semibold uppercase tracking-wider">
                          Сотилган
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold uppercase tracking-wider">
                          Амаллар
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {products.map((product, index) => (
                        <motion.tr
                          key={product._id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setViewData(product)}
                          className={`hover:bg-gray-50 cursor-pointer ${product.count == 0 ? "bg-red-300 hover:bg-red-200" : ""}`}
                        >
                          {/* Product Info */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {product.mainImages && product.mainImages.length > 0 ? (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="relative h-12 min-w-12 w-12 rounded-lg overflow-hidden">
                                  <img
                                    onClick={() => openPreview(product.mainImages, 0)}
                                    src={product.mainImages[0]}
                                    alt={product.title}
                                    className="w-full h-full object-cover cursor-pointer"
                                  />
                                </div>
                              ) : (
                                <div className="h-12 min-w-12 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              )}

                              <div>
                                <p className="font-semibold text-gray-800">
                                  {product.title}
                                </p>
                                <p className="text-sm text-gray-600">
                                  АРТ: {product.sku}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Stock */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 min-w-[100px]">
                              <Package size={16} className="text-gray-600" />
                              <span className="font-semibold text-gray-800">
                                {product.count} дона
                              </span>
                            </div>
                          </td>

                          {/* Sold */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <BarChart3 size={16} className="text-green-500" />
                              <span className="font-semibold text-gray-800">
                                {product.sold || 0} дона
                              </span>
                            </div>
                          </td>


                          {/* Actions */}
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setViewData(product)}
                                className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600 transition-colors"
                                title="Кўриш"
                              >
                                <Eye size={16} />
                              </motion.button>

                              {user.role === 'admin' && (
                                <>
                                  <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setDeleteConfirm(product)}
                                    className="bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition-colors"
                                    title="Ўчириш"
                                  >
                                    <Trash2 size={16} />
                                  </motion.button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {products.length === 0 && (
                  <div className="text-center py-12">
                    <Boxes size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-lg font-semibold mb-2 text-gray-600">
                      Маҳсулотлар топилмади
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {search || category || searchDate
                        ? 'Қидирув шартларингизга мос келувчи маҳсулотлар топилмади'
                        : 'Ҳали маҳсулот қўшилмаган'}
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page <= 1}
                          className={`p-2 rounded-lg ${page <= 1
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200'
                            } text-gray-800`}
                        >
                          <ChevronLeft size={20} />
                        </button>

                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                            let pageNum
                            if (pagination.totalPages <= 5) {
                              pageNum = i + 1
                            } else if (page <= 3) {
                              pageNum = i + 1
                            } else if (page >= pagination.totalPages - 2) {
                              pageNum = pagination.totalPages - 4 + i
                            } else {
                              pageNum = page - 2 + i
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => handlePageChange(pageNum)}
                                className={`w-10 h-10 rounded-lg flex items-center justify-center ${page === pageNum
                                  ? 'bg-blue-500 text-white'
                                  : 'hover:bg-gray-200 text-gray-800'
                                  }`}
                              >
                                {pageNum}
                              </button>
                            )
                          })}
                        </div>

                        <button
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page >= pagination.totalPages}
                          className={`p-2 rounded-lg ${page >= pagination.totalPages
                            ? 'opacity-50 cursor-not-allowed'
                            : 'hover:bg-gray-200'
                            } text-gray-800`}
                        >
                          <ChevronRight size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </div>
          </>
        )
        }

        {/* Modals */}
        <AddProductModal open={open} setOpen={setOpen} mutate={mutate} />

        {/* Product Detail Modal with Image Management */}
        <AnimatePresence>
          {viewData && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                // Agar edit mode da bo'lsa, chiqishdan oldin tasdiqlash
                if (isEditMode(viewData._id)) {
                  if (window.confirm('Ўзгартиришлар сақланмаган. Ростдан чиқмоқчимисиз?')) {
                    handleCancelEditing(viewData._id)
                    setViewData(null)
                  }
                } else {
                  setViewData(null)
                }
              }}
              className="fixed inset-0 bg-black/10 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl relative bg-white"
              >
                <div className="sticky z-10 top-0 border-b border-gray-200 px-4 md:px-6 py-4 rounded-t-2xl flex justify-between items-center bg-white">
                  <h2 className="text-lg md:text-xl font-bold flex items-center gap-2 text-gray-800">
                    <Tag size={20} className="text-blue-600" />
                    Маҳсулот маълумотлари
                    {isEditMode(viewData._id) && (
                      <span className="text-sm px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
                        Таҳрирланаётган
                      </span>
                    )}
                  </h2>
                  <button
                    onClick={() => {
                      if (isEditMode(viewData._id)) {
                        if (window.confirm('Ўзгартиришлар сақланмаган. Ростдан чиқмоқчимисиз?')) {
                          handleCancelEditing(viewData._id)
                          setViewData(null)
                        }
                      } else {
                        setViewData(null)
                      }
                    }}
                    className="text-gray-500 hover:text-black transition p-1 rounded-full hover:bg-gray-100"
                  >
                    <X />
                  </button>
                </div>

                <div className="p-4 md:p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left Column - Images Management */}
                    <div className="space-y-6">
                      {/* Existing Images */}
                      <div>
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
                            Мавжуд расмлар
                          </h3>
                          {viewData.mainImages && viewData.mainImages.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {viewData.mainImages.length} та расм
                            </span>
                          )}
                        </div>

                        {viewData.mainImages && viewData.mainImages.length > 0 ? (
                          <div className="grid grid-cols-2 gap-3">
                            {viewData.mainImages.map((img, index) => (
                              <div
                                key={index}
                                className="relative group rounded-lg overflow-hidden border border-gray-300"
                              >
                                <img
                                  src={img}
                                  alt={`${viewData.title} - ${index + 1}`}
                                  className="w-full h-32 object-cover hover:scale-105 transition-transform duration-300"
                                  onClick={() => setImagePreview(img)}
                                />

                                {/* Remove button overlay */}
                                <div className="absolute inset-0 bg-black/0  transition-all duration-300 flex items-center justify-center">
                                  {removingImages[img] ? (
                                    <div className="p-2 bg-red-500 rounded-full">
                                      <Loader2 className="h-5 w-5 text-white animate-spin" />
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleImageRemove(viewData._id, img)}
                                      className="transform -translate-y-10 translate-x-15 transition-all duration-300 p-2 bg-red-500 rounded-full"
                                      title="Расмни ўчириш"
                                      disabled={!user.role === 'admin'}
                                    >
                                      <Trash2 className="h-5 w-5 text-white" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="h-48 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 flex flex-col items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-gray-400 mb-3" />
                            <p className="text-sm text-gray-600">Расмлар мавжуд эмас</p>
                          </div>
                        )}
                      </div>

                      {/* Upload New Images - Faqat admin uchun */}
                      {/* {user.role === 'admin' && ( */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600">
                            Янги расмлар қўшиш
                          </h3>
                          {selectedFiles[viewData._id] && (
                            <button
                              onClick={() => clearSelectedFiles(viewData._id)}
                              className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                            >
                              <X size={12} />
                              Тозалаш
                            </button>
                          )}
                        </div>

                        {/* File Input Area */}
                        <div className="relative">
                          <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => handleFileSelect(viewData._id, e)}
                            className="hidden"
                          />

                          {/* Drag & Drop Area */}
                          <div
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-2 text-center cursor-pointer transition-all duration-300 hover:border-blue-500 hover:bg-blue-50 ${selectedFiles[viewData._id] ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
                          >
                            <div className="flex gap-2">
                              <div className="flex justify-center">
                                <div className="p-3 bg-blue-100 rounded-full">
                                  <Upload className="h-6 w-6 text-blue-600" />
                                </div>
                              </div>
                              <div>
                                <p className="font-medium text-gray-800">
                                  {selectedFiles[viewData._id]
                                    ? `${selectedFiles[viewData._id].length} та расм танланди`
                                    : 'Расмларни юклаш учун босинг'
                                  }
                                </p>
                                <p className="text-xs text-gray-600 mt-1">
                                  PNG, JPG, JPEG (макс. 5MB)
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Local Previews */}
                          {localImagePreviews[viewData._id] && localImagePreviews[viewData._id].length > 0 && (
                            <div className="mt-4">
                              <p className="text-xs font-medium text-gray-600 mb-2">Танланган расмлар:</p>
                              <div className="grid grid-cols-4 gap-2">
                                {localImagePreviews[viewData._id].map((url, index) => (
                                  <div key={index} className="relative rounded-lg overflow-hidden">
                                    <img
                                      src={url}
                                      alt={`Preview ${index + 1}`}
                                      className="w-full h-20 object-cover"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                    <span className="absolute bottom-1 right-1 text-xs text-white bg-black/50 px-1 rounded">
                                      {index + 1}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Progress Bar */}
                          {uploadProgress[viewData._id] && (
                            <div className="mt-4 space-y-2">
                              <div className="flex justify-between text-xs text-gray-600">
                                <span>Юкланмоқда...</span>
                                <span>
                                  {uploadProgress[viewData._id].completed}/{uploadProgress[viewData._id].total}
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${(uploadProgress[viewData._id].completed / uploadProgress[viewData._id].total) * 100}%`
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Upload Button */}
                        {selectedFiles[viewData._id] && (
                          <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onClick={() => handleImageUpload(viewData._id, selectedFiles[viewData._id])}
                            disabled={uploadingImages[viewData._id]}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 rounded-xl font-medium hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {uploadingImages[viewData._id] ? (
                              <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                {uploadProgress[viewData._id] ? (
                                  `Юкланмоқда (${uploadProgress[viewData._id].current}/${uploadProgress[viewData._id].total})`
                                ) : (
                                  'Юкланмоқда...'
                                )}
                              </>
                            ) : (
                              <>
                                <Upload className="h-5 w-5" />
                                {selectedFiles[viewData._id].length} та расмни юклаш
                              </>
                            )}
                          </motion.button>
                        )}
                      </div>
                      {/* )} */}
                    </div>

                    {/* Right Column - Product Details */}
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div className="space-y-4">
                        {/* Title */}
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">
                            Маҳсулот номи
                          </label>
                          <input
                            type="text"
                            value={editing[viewData._id]?.title || viewData.title}
                            onChange={e => handleChange(viewData._id, 'title', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-3 text-lg font-semibold"
                          />
                        </div>

                        {/* АРТ & Category */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              АРТ:
                            </label>
                            <p className="font-medium text-gray-800">{viewData.sku}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              Сана:
                            </label>
                            <p className="font-medium text-gray-800">{dayjs(viewData.createdAt).format("DD.MM.YYYY HH:mm")}</p>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              Категория
                            </label>
                            {user.role === 'admin' ? (
                              <select
                                value={editing[viewData._id]?.category || viewData.category}
                                onChange={e => handleChange(viewData._id, 'category', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              >
                                {categories.map(cat => (
                                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                              </select>
                            ) : (
                              <p className="font-medium text-gray-800">
                                {categories.find(c => c.value === viewData.category)?.label || viewData.category}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Gender, Season, Material */}
                        {/* <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              Жинс
                            </label>
                            {user.role === 'admin' ? (
                              <select
                                value={editing[viewData._id]?.gender || viewData.gender}
                                onChange={e => handleChange(viewData._id, 'gender', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              >
                                {genders.map(g => (
                                  <option key={g.value} value={g.value}>{g.label}</option>
                                ))}
                              </select>
                            ) : (
                              <p className="font-medium text-gray-800">
                                {genders.find(g => g.value === viewData.gender)?.label || viewData.gender}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              Фасл
                            </label>
                            {user.role === 'admin' ? (
                              <select
                                value={editing[viewData._id]?.season || viewData.season}
                                onChange={e => handleChange(viewData._id, 'season', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              >
                                {seasons.map(season => (
                                  <option key={season.value} value={season.value}>{season.label}</option>
                                ))}
                              </select>
                            ) : (
                              <p className="font-medium text-gray-800">
                                {seasons.find(s => s.value === viewData.season)?.label || viewData.season}
                              </p>
                            )}
                          </div>
                          <div>
                            <label className="text-xs font-medium text-gray-600 block mb-1">
                              Материал
                            </label>
                            {user.role === 'admin' ? (
                              <input
                                type="text"
                                value={editing[viewData._id]?.material || viewData.material}
                                onChange={e => handleChange(viewData._id, 'material', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                              />
                            ) : (
                              <p className="font-medium text-gray-800">{viewData.material}</p>
                            )}
                          </div>
                        </div> */}
                      </div>

                      {/* Stock & Status Summary */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-xl p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                          <div className="flex items-center gap-3 mb-2">
                            <Package size={20} className="text-blue-600" />
                            <div>
                              <p className="text-xs text-gray-600">Умумий дона</p>
                              <p className="text-2xl font-bold text-gray-800">
                                {calculateTotalStock(viewData)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Ҳолат</span>
                            <span className={`font-semibold ${viewData.count != 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {viewData.count != 0 ? 'Мавжуд' : 'Тугаган'}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl p-4 bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                          <div className="flex items-center gap-3 mb-2">
                            <BarChart3 size={20} className="text-green-600" />
                            <div>
                              <p className="text-xs text-gray-600">Сотилган</p>
                              <p className="text-2xl font-bold text-gray-800">
                                {viewData.sold || 0}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between">
                            <span className="text-sm text-gray-600">АРТ:</span>
                            <span className="font-semibold">{viewData.sku}</span>
                          </div>
                        </div>
                      </div>

                      {/* Count Field (if needed for editing) */}
                      {/* {user.role === 'admin' && (
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">
                            Дона сони
                          </label>
                          <input
                            type="number"
                            value={editing[viewData._id]?.count || viewData.count || 0}
                            onChange={e => handleChange(viewData._id, 'count', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            min="0"
                          />
                        </div>
                      )} */}

                      {/* QR Code */}
                      {/* <div className="rounded-xl p-4 bg-gray-50 border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-700 mb-3">QR Код</h4>
                        <div className="flex items-center gap-4">
                          <img
                            src={viewData.qrCode}
                            alt="QR Code"
                            className="w-24 h-24"
                          />
                          <div>
                            <p className="text-sm text-gray-600 mb-1">
                              Ушбу QR код маҳсулотни тез идентификация қилиш учун
                            </p>
                            <button
                              onClick={() => navigator.clipboard.writeText(viewData.sku)}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            >
                              АРТ ни копия қилиш
                            </button>
                          </div>
                        </div>
                      </div> */}
                    </div>
                  </div>
                </div>

                {/* Action Buttons - Faqat edit mode da va admin uchun */}
                {isEditMode(viewData._id) && (
                  <div className="sticky bottom-0 border-t border-gray-200 px-4 md:px-6 py-4 rounded-b-2xl flex justify-end gap-3 bg-white">
                    <button
                      onClick={() => handleCancelEditing(viewData._id)}
                      className="px-4 py-2 rounded-lg font-medium transition-colors bg-gray-200 text-gray-800 hover:bg-gray-300"
                    >
                      Бекор қилиш
                    </button>
                    <button
                      onClick={() => handleSave(viewData._id)}
                      disabled={loading === viewData._id}
                      className="flex items-center gap-2 bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors shadow-sm"
                    >
                      {loading === viewData._id ? (
                        <Loader2 className="animate-spin" size={18} />
                      ) : (
                        <Save size={18} />
                      )}
                      Сақлаш
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Image Preview Modal */}
        <AnimatePresence>
          {previewImages.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImages([])}
              className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                onClick={(e) => e.stopPropagation()}
                className="relative max-w-4xl max-h-[80vh] flex items-center"
              >
                {/* PREV */}
                {previewImages.length > 1 && (
                  <button
                    onClick={() =>
                      setActiveIndex((prev) =>
                        prev === 0 ? previewImages.length - 1 : prev - 1
                      )
                    }
                    className="absolute left-[-60px] text-white text-3xl bg-black/50 w-12 h-12 rounded-full hover:bg-black/70"
                  >
                    ‹
                  </button>
                )}

                {/* IMAGE */}
                <img
                  src={previewImages[activeIndex]}
                  alt="Preview"
                  className="max-w-[70vw] max-h-[80vh] h-auto w-auto object-contain rounded-lg"
                />

                {/* NEXT */}
                {previewImages.length > 1 && (
                  <button
                    onClick={() =>
                      setActiveIndex((prev) =>
                        prev === previewImages.length - 1 ? 0 : prev + 1
                      )
                    }
                    className="absolute right-[-60px] text-white text-3xl bg-black/50 w-12 h-12 rounded-full hover:bg-black/70"
                  >
                    ›
                  </button>
                )}

                {/* CLOSE */}
                <button
                  onClick={() => setPreviewImages([])}
                  className="absolute -top-10 -right-10 bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  <X />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl shadow-2xl p-6 bg-white"
              >
                <div className="text-center">
                  <Trash2 className="h-12 w-12 mx-auto mb-4 text-red-500" />
                  <h3 className="text-xl font-bold mb-2 text-gray-800">
                    Маҳсулотни ўчириш
                  </h3>
                  <p className="mb-6 text-gray-600">
                    <strong>"{deleteConfirm.title}"</strong> маҳсулотини ўчирмоқчимисиз?
                    <br />
                    <span className="text-red-500">Бу амални бекор қилиб бўлмайди!</span>
                  </p>

                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-6 py-2 rounded-lg font-medium transition-colors bg-gray-200 text-gray-800 hover:bg-gray-300"
                    >
                      Бекор қилиш
                    </button>
                    {user.role === 'admin' && (
                      <button
                        onClick={() => handleDelete(deleteConfirm._id)}
                        disabled={deleting === deleteConfirm._id}
                        className="flex items-center gap-2 bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                      >
                        {deleting === deleteConfirm._id ? (
                          <Loader2 className="animate-spin" size={18} />
                        ) : (
                          <Trash2 size={18} />
                        )}
                        Ўчириш
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div >
    </div >
  )
}