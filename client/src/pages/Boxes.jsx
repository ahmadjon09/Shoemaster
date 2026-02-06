import { useState, useContext, useMemo, useEffect } from 'react'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    User,
    MapPin,
    ChevronLeft,
    Package,
    Search,
    AlertCircle,
    Box,
    Ruler,
    Scale,
    Layers,
    DollarSign,
    BarChart3,
    TrendingUp,
    Eye,
    Edit,
    Trash2,
    Loader2,
    Send,
    Plus,
    History,
    ChevronRight,
    ChevronLeft as ChevronLeftIcon,
    RefreshCw,
    Save,
    AlertTriangle,
} from 'lucide-react'
import Fetch from '../middlewares/fetcher'
import { ContextData } from '../contextData/Context'
import { LoadingState } from '../components/loading-state'

export const Boxes = () => {
    const { data, error, isLoading, mutate } = useSWR('/products/clients', Fetch, {
        refreshInterval: 50000,
        revalidateOnFocus: true,
        revalidateOnReconnect: true
    })
    const { user, dark } = useContext(ContextData)

    const [searchPhone, setSearchPhone] = useState('')
    const [searchName, setSearchName] = useState('')
    const [selectedClient, setSelectedClient] = useState(null)
    const [selectedProduct, setSelectedProduct] = useState(null)
    const [editingProduct, setEditingProduct] = useState(null)
    const [loading, setLoading] = useState(null)
    const [showEditModal, setShowEditModal] = useState(false)

    // Qarz to'lash state lari - Yaxshilangan
    const [debtPayment, setDebtPayment] = useState({
        uz: { amount: '', loading: false },
        en: { amount: '', loading: false }
    })

    // Pagination state lari - localStorage bilan saqlash
    const [currentClientPage, setCurrentClientPage] = useState(() => {
        const saved = localStorage.getItem('clientProductsView_clientPage')
        return saved ? parseInt(saved) : 1
    })
    const [currentProductPage, setCurrentProductPage] = useState(() => {
        const saved = localStorage.getItem('clientProductsView_productPage')
        return saved ? parseInt(saved) : 1
    })
    const [currentHistoryPage, setCurrentHistoryPage] = useState(() => {
        const saved = localStorage.getItem('clientProductsView_historyPage')
        return saved ? parseInt(saved) : 1
    })

    // Selected client ID ni saqlash
    const [selectedClientId, setSelectedClientId] = useState(() => {
        return localStorage.getItem('clientProductsView_selectedClientId')
    })

    const clientsPerPage = 10
    const productsPerPage = 10
    const historyPerPage = 10

    // Auto-refresh effect
    useEffect(() => {
        const interval = setInterval(() => {
            if (!selectedClient) {
                mutate()
            }
        }, 10000)

        return () => clearInterval(interval)
    }, [selectedClient, mutate])

    // Update selected client when data changes
    useEffect(() => {
        if (selectedClientId && data?.data?.data) {
            const updatedClient = data.data.data.find(client =>
                client._id === selectedClientId
            )
            if (updatedClient) {
                setSelectedClient(updatedClient)
            }
        }
    }, [data, selectedClientId])

    // LocalStorage ga pagination va selectedClient ni saqlash
    useEffect(() => {
        localStorage.setItem('clientProductsView_clientPage', currentClientPage)
    }, [currentClientPage])

    useEffect(() => {
        localStorage.setItem('clientProductsView_productPage', currentProductPage)
    }, [currentProductPage])

    useEffect(() => {
        localStorage.setItem('clientProductsView_historyPage', currentHistoryPage)
    }, [currentHistoryPage])

    useEffect(() => {
        if (selectedClient) {
            localStorage.setItem('clientProductsView_selectedClientId', selectedClient._id)
            setSelectedClientId(selectedClient._id)
        } else {
            localStorage.removeItem('clientProductsView_selectedClientId')
            setSelectedClientId(null)
        }
    }, [selectedClient])

    const clients = (data?.data.data || []).filter(u => u.clietn === false)

    // Filter clients
    const filteredClients = useMemo(() => {
        return clients.filter(client => {
            const phoneMatch = client.phoneNumber
                ?.toLowerCase()
                .includes(searchPhone.toLowerCase())
            const nameMatch = client.name
                ?.toLowerCase()
                .includes(searchName.toLowerCase())

            return phoneMatch && nameMatch
        })
    }, [clients, searchPhone, searchName])

    // Client pagination
    const currentClients = useMemo(() => {
        const startIndex = (currentClientPage - 1) * clientsPerPage
        const endIndex = startIndex + clientsPerPage
        return filteredClients.slice(startIndex, endIndex)
    }, [filteredClients, currentClientPage])

    const totalClientPages = Math.ceil(filteredClients.length / clientsPerPage)

    // Product pagination for selected client
    const currentProducts = useMemo(() => {
        if (!selectedClient?.products) return []
        const startIndex = (currentProductPage - 1) * productsPerPage
        const endIndex = startIndex + productsPerPage
        return selectedClient.products.slice(startIndex, endIndex)
    }, [selectedClient, currentProductPage])

    const totalProductPages = Math.ceil((selectedClient?.products?.length || 0) / productsPerPage)

    // Calculate product balances by unit for a single client
    const calculateClientProductBalances = (products) => {
        const balances = {}
        let totalReadyProducts = 0
        let totalRawProducts = 0
        let totalValueUZ = 0
        let totalValueEN = 0

        products.forEach(product => {
            const unit = product.unit || 'дона'
            const title = product.title
            const stock = Number(product.stock) || 0
            const price = Number(product.price) || 0
            const priceType = product.priceType || 'uz'

            // Product balances by unit
            if (!balances[title]) {
                balances[title] = {}
            }
            if (!balances[title][unit]) {
                balances[title][unit] = 0
            }
            balances[title][unit] += stock

            // Count ready/raw products
            if (product.ready) {
                totalReadyProducts += 1
            } else {
                totalRawProducts += 1
            }

            // Calculate total value
            if (priceType === 'uz') {
                totalValueUZ += price * stock
            } else {
                totalValueEN += price * stock
            }
        })

        return {
            balances,
            totalReadyProducts,
            totalRawProducts,
            totalValueUZ,
            totalValueEN,
            totalProducts: products.length
        }
    }

    // Calculate overall balances for all products (aggregated by unit)
    const calculateOverallBalances = (products) => {
        const overallBalances = {}

        products.forEach(product => {
            const unit = product.unit || 'дона'
            const stock = Number(product.stock) || 0

            if (!overallBalances[unit]) {
                overallBalances[unit] = 0
            }
            overallBalances[unit] += stock
        })

        return overallBalances
    }

    // Get unit icon
    const getUnitIcon = (unit) => {
        switch (unit) {
            case 'кг':
                return <Scale size={16} className="text-orange-500" />
            case 'метр':
                return <Ruler size={16} className="text-blue-500" />
            case 'литр':
                return <Layers size={16} className="text-green-500" />
            case 'м²':
                return <Box size={16} className="text-purple-500" />
            case 'м³':
                return <Box size={16} className="text-indigo-500" />
            default:
                return <Package size={16} className="text-gray-500" />
        }
    }

    // Format currency with better UX
    const formatCurrency = (amount, currency = 'UZS') => {
        if (!amount && amount !== 0) return '0'

        return new Intl.NumberFormat('uz-UZ', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0
        }).format(amount)
    }

    // Format number with thousands separator
    const formatNumber = (number) => {
        if (!number && number !== 0) return '0'
        return new Intl.NumberFormat('uz-UZ').format(number)
    }

    // Allow only numbers and dots for decimal input
    const handleDecimalInput = (value, setter) => {
        // Allow only numbers and dots
        const cleanedValue = value.replace(/[^\d.]/g, '')

        // Ensure only one dot
        const parts = cleanedValue.split('.')
        if (parts.length > 2) {
            // If more than one dot, keep only the first part and first decimal
            setter(parts[0] + '.' + parts.slice(1).join(''))
        } else {
            setter(cleanedValue)
        }
    }

    // Handle product delete
    const handleDelete = async (productId) => {
        const confirmed = window.confirm('❌ Сиз ростдан ҳам бу маҳсулотни ўчирмоқчимисиз?')
        if (!confirmed) return

        try {
            setLoading(productId)
            await Fetch.delete(`/products/in/${productId}`)
            await mutate()
            alert('✅ Маҳсулот муваффақиятли ўчирилди')
        } catch (err) {
            console.error('Delete error:', err)
            alert('❌ Маҳсулотни ўчиришда хатолик юз берди')
        } finally {
            setLoading(null)
        }
    }

    // Handle input change for editing - allow only numbers and dots for numeric fields
    const handleInputChange = (field, value) => {
        if (field === 'price' || field === 'stock') {
            // Allow only numbers and dots for price and stock
            const cleanedValue = value.replace(/[^\d.]/g, '')

            // Ensure only one dot
            const parts = cleanedValue.split('.')
            const formattedValue = parts.length > 2
                ? parts[0] + '.' + parts.slice(1).join('')
                : cleanedValue

            setEditingProduct(prev => ({
                ...prev,
                [field]: formattedValue
            }))
        } else if (field === 'ready') {
            setEditingProduct(prev => ({
                ...prev,
                [field]: value === 'true'
            }))
        } else {
            setEditingProduct(prev => ({
                ...prev,
                [field]: value
            }))
        }
    }

    // Edit product modalini ochish
    const handleEditClick = (product) => {
        const confirmed = window.confirm(
            '⚠️ Диққат! Маҳсулотнинг нархи ва нарх турини ўзгартириш мумкин. ' +
            'Аммо маҳсулот номини ўзгартириб бўлмайди. ' +
            'Давом этасизми?'
        )

        if (confirmed) {
            setEditingProduct({
                ...product,
                stock: String(product.stock),
                price: String(product.price)
            })
            setShowEditModal(true)
        }
    }

    // Productni yangilash
    const handleUpdateProduct = async () => {
        if (!editingProduct) return

        // Validation
        if (!editingProduct.price || parseFloat(editingProduct.price) <= 0) {
            alert('❌ Нархни киритинг')
            return
        }

        if (!editingProduct.stock || parseFloat(editingProduct.stock) <= 0) {
            alert('❌ Миқдорни киритинг')
            return
        }

        try {
            setLoading(editingProduct._id)

            const updatedData = {
                price: parseFloat(editingProduct.price),
                stock: parseFloat(editingProduct.stock),
                priceType: editingProduct.priceType,
                ready: editingProduct.ready
            }

            await Fetch.put(`/products/in/${editingProduct._id}`, updatedData)

            await mutate()
            setShowEditModal(false)
            setEditingProduct(null)
            alert('✅ Маҳсулот муваффақиятли янгиланди')
        } catch (err) {
            console.error('Update error:', err)
            alert('❌ Маҳсулотни янгилашда хатолик юз берди')
        } finally {
            setLoading(null)
        }
    }

    // Qarz to'lash funksiyasi (umumiy)
    const handlePayDebt = async (currency) => {
        if (!selectedClient) {
            alert('❌ Мижоз танланмаган')
            return
        }

        const amountStr = debtPayment[currency].amount
        const amount = parseFloat(amountStr.replace(/[^\d.]/g, ''))

        if (!amount || amount <= 0) {
            alert('❌ Тўлов суммасини киритинг')
            return
        }

        // Check if payment amount exceeds debt
        const clientDebt = selectedClient[`debt${currency.toUpperCase()}`] || 0
        if (amount > clientDebt) {
            const confirmOverpay = window.confirm(
                `⚠️ Тўлов суммаси (${formatCurrency(amount, currency === 'uz' ? 'UZS' : 'USD')}) қарз суммасидан (${formatCurrency(clientDebt, currency === 'uz' ? 'UZS' : 'USD')}) ошса, ортиқча сумма берилган ҳисобланади. Давом этасизми?`
            )
            if (!confirmOverpay) return
        }

        try {
            setDebtPayment(prev => ({
                ...prev,
                [currency]: { ...prev[currency], loading: true }
            }))

            const response = await Fetch.post("/products/pay", {
                clientId: selectedClient._id,
                [currency]: amount
            })

            // Reset input
            setDebtPayment(prev => ({
                ...prev,
                [currency]: { ...prev[currency], amount: '', loading: false }
            }))

            await mutate()
            alert("✅ Қарз муваффақиятли тўланди")
        } catch (error) {
            console.error('Pay debt error:', error)
            const errorMessage = error.response?.data?.message || error.message || 'Тўловда номаълум хатолик'

            // Handle specific errors
            if (error.response?.status === 400) {
                alert(`❌ Қарз тўлашда хатолик: ${errorMessage}`)
            } else if (error.response?.status === 404) {
                alert('❌ Мижоз топилмади')
            } else {
                alert(`❌ Тўловда хатолик юз берди: ${errorMessage}`)
            }
        } finally {
            setDebtPayment(prev => ({
                ...prev,
                [currency]: { ...prev[currency], loading: false }
            }))
        }
    }

    // Handle debt input changes
    const handleDebtAmountChange = (currency, value) => {
        // Allow only numbers and dots
        const cleanedValue = value.replace(/[^\d.]/g, '')

        // Ensure only one dot
        const parts = cleanedValue.split('.')
        const formattedValue = parts.length > 2
            ? parts[0] + '.' + parts.slice(1).join('')
            : cleanedValue

        setDebtPayment(prev => ({
            ...prev,
            [currency]: { ...prev[currency], amount: formattedValue }
        }))
    }

    // History pagination hisoblash
    const getCurrentHistory = () => {
        if (!selectedClient || !selectedClient.history) return []

        const startIndex = (currentHistoryPage - 1) * historyPerPage
        const endIndex = startIndex + historyPerPage
        return selectedClient.history.slice(startIndex, endIndex)
    }

    const totalHistoryPages = Math.ceil((selectedClient?.history?.length || 0) / historyPerPage)

    // Sahifalash funksiyalari
    const goToNextHistoryPage = () => {
        if (currentHistoryPage < totalHistoryPages) {
            setCurrentHistoryPage(currentHistoryPage + 1)
        }
    }

    const goToPrevHistoryPage = () => {
        if (currentHistoryPage > 1) {
            setCurrentHistoryPage(currentHistoryPage - 1)
        }
    }

    const goToNextClientPage = () => {
        if (currentClientPage < totalClientPages) {
            setCurrentClientPage(currentClientPage + 1)
        }
    }

    const goToPrevClientPage = () => {
        if (currentClientPage > 1) {
            setCurrentClientPage(currentClientPage - 1)
        }
    }

    const goToNextProductPage = () => {
        if (currentProductPage < totalProductPages) {
            setCurrentProductPage(currentProductPage + 1)
        }
    }

    const goToPrevProductPage = () => {
        if (currentProductPage > 1) {
            setCurrentProductPage(currentProductPage - 1)
        }
    }

    // Reset pagination when client changes
    const handleClientSelect = (client) => {
        setSelectedClient(client)
        setCurrentProductPage(1)
        setCurrentHistoryPage(1)
        // Reset debt payment inputs
        setDebtPayment({
            uz: { amount: '', loading: false },
            en: { amount: '', loading: false }
        })
    }

    const handleBackToClients = () => {
        setSelectedClient(null)
        setCurrentClientPage(1)
    }

    // Reset client pagination when search changes
    useEffect(() => {
        setCurrentClientPage(1)
    }, [searchPhone, searchName])

    // Manual refresh function
    const handleRefresh = async () => {
        await mutate()
    }

    // Dark mode styles
    const bgGradient = dark
        ? 'from-gray-900 to-gray-800'
        : 'from-blue-50 to-indigo-100'

    const cardBg = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    const textColor = dark ? 'text-white' : 'text-gray-800'
    const textMuted = dark ? 'text-gray-300' : 'text-gray-600'
    const inputBg = dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
    const headerBg = dark ? 'from-gray-700 to-gray-600' : 'from-gray-50 to-gray-100'
    const tableHeaderBg = dark ? 'from-gray-700 to-gray-600' : 'from-gray-50 to-gray-100'
    const tableHeaderText = dark ? 'text-gray-200' : 'text-gray-700'
    const tableRowHover = dark ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
    const borderColor = dark ? 'border-gray-700' : 'border-gray-200'
    const modalBg = dark ? 'bg-gray-800' : 'bg-white'
    const debtCardBg = dark ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'
    const debtText = dark ? 'text-red-200' : 'text-red-700'

    if (isLoading) {
        return (
            <div className={`min-h-screen flex justify-center items-center ${dark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
                <LoadingState />
            </div>
        )
    }

    if (error)
        return (
            <div className={`min-h-screen flex items-center justify-center ${dark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`text-center p-8 rounded-2xl border max-w-md ${dark ? 'bg-gray-800 border-gray-700' : 'bg-red-50 border-red-200'
                        }`}
                >
                    <AlertCircle className='mx-auto text-red-500 mb-4' size={48} />
                    <h3 className={`text-lg font-semibold mb-2 ${dark ? 'text-red-300' : 'text-red-800'
                        }`}>
                        Юклашда хатолик
                    </h3>
                    <p className={dark ? 'text-red-200' : 'text-red-600'}>
                        Қолдиқ товарлар маълумотларини юклашда хатолик юз берди. Илтимос, қайта уриниб кўринг.
                    </p>
                    <button
                        onClick={handleRefresh}
                        className='mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors'
                    >
                        Қайта уриниш
                    </button>
                </motion.div>
            </div>
        )

    return (
        <div className={`min-h-screen bg-gradient-to-br ${bgGradient} p-4 md:p-6 transition-colors duration-300`}>
            <div className='mx-auto space-y-6'>
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`rounded-2xl shadow-lg p-6 border ${cardBg} ${borderColor}`}
                >
                    <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4'>
                        <div className='flex items-center gap-4'>
                            {selectedClient ? (
                                <motion.button
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={handleBackToClients}
                                    className={`flex items-center gap-2 ${dark ? 'text-blue-400 hover:text-blue-300 bg-blue-900 hover:bg-blue-800'
                                        : 'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100'
                                        } px-4 py-2 rounded-xl transition-all duration-300`}
                                >
                                    <ChevronLeft size={20} />
                                    Орқага
                                </motion.button>
                            ) : (
                                <div className='bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl shadow-lg'>
                                    <User className='text-white' size={28} />
                                </div>
                            )}
                            <div>
                                <h1 className={`text-2xl md:text-3xl font-bold ${textColor}`}>
                                    {selectedClient
                                        ? `${selectedClient.name} маҳсулотлари`
                                        : 'Қолдиқ товарлар'}
                                </h1>
                                <p className={`${textMuted} mt-1`}>
                                    {selectedClient
                                        ? `${selectedClient.products?.length || 0} та маҳсулот топилди`
                                        : `${filteredClients.length} та мижоз топилди`}
                                </p>
                            </div>
                        </div>

                        <div className='flex items-center gap-3'>
                            <button
                                onClick={handleRefresh}
                                className='flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600 transition-colors duration-300'
                            >
                                <RefreshCw size={18} />
                                Янгилаш
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Search Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className={`rounded-2xl shadow-lg p-6 border ${cardBg} ${borderColor}`}
                >
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                        <div className='relative'>
                            <Search
                                className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${dark ? 'text-gray-400' : 'text-gray-400'
                                    }`}
                                size={20}
                            />
                            <input
                                type='text'
                                placeholder='Телефон рақам...'
                                value={searchPhone}
                                onChange={e => setSearchPhone(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 ${inputBg}`}
                            />
                        </div>

                        <div className='relative'>
                            <User
                                className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${dark ? 'text-gray-400' : 'text-gray-400'
                                    }`}
                                size={20}
                            />
                            <input
                                type='text'
                                placeholder='Мижоз номи...'
                                value={searchName}
                                onChange={e => setSearchName(e.target.value)}
                                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 ${inputBg}`}
                            />
                        </div>
                    </div>
                </motion.div>

                {!selectedClient && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                    >
                        {filteredClients.length === 0 ? (
                            <div className={`rounded-2xl shadow-lg p-12 text-center border ${cardBg} ${borderColor}`}>
                                <User className={`mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-gray-400'}`} size={64} />
                                <h3 className={`text-xl font-semibold mb-2 ${textMuted}`}>
                                    Қолдиқ товарлар топилмади
                                </h3>
                                <p className={`${textMuted} mb-6`}>
                                    Қидирув шартларингизга мос келувчи Таминотчилар мавжуд эмас
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchPhone('')
                                        setSearchName('')
                                    }}
                                    className='text-blue-500 hover:text-blue-700 font-semibold'
                                >
                                    Филтрни тозалаш
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
                                    {currentClients.map((client, index) => {
                                        const productBalances = calculateClientProductBalances(client.products || [])
                                        const overallBalances = calculateOverallBalances(client.products || [])

                                        return (
                                            <motion.div
                                                key={client._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: index * 0.1 }}
                                                onClick={() => handleClientSelect(client)}
                                                className={`rounded-2xl shadow-lg p-6 border ${dark ? 'border-gray-700' : 'border-gray-200'
                                                    } hover:shadow-xl ${dark ? 'hover:border-green-600' : 'hover:border-green-300'
                                                    } transition-all duration-300 cursor-pointer group`}
                                            >
                                                <div className='flex items-start justify-between mb-4'>
                                                    <div className='flex items-center gap-3'>
                                                        <div className='bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300'>
                                                            <User className='text-white' size={24} />
                                                        </div>
                                                        <div>
                                                            <h3 className={`font-bold text-lg ${textColor}`}>
                                                                {client.name || 'Номаълум'}
                                                            </h3>
                                                            <p className={`${textMuted} text-sm`}>
                                                                {client.phoneNumber}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className='text-right'>
                                                        <div className='flex items-center gap-1 text-blue-600 font-semibold text-lg'>
                                                            <Package size={18} />
                                                            <span>{client.products?.length || 0}</span>
                                                        </div>
                                                        <div className={`text-xs ${textMuted}`}>маҳсулот</div>
                                                    </div>
                                                </div>

                                                <div className='flex items-center gap-2 text-sm text-gray-600 mb-3'>
                                                    <MapPin size={16} />
                                                    <span className={`truncate ${textMuted}`}>
                                                        {client.address || 'Манзил кўрсатилмаган'}
                                                    </span>
                                                </div>


                                                {/* Overall Balances */}
                                                {Object.keys(overallBalances).length > 0 && (
                                                    <div className={`mb-3 p-3 rounded-lg border ${dark ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200'
                                                        }`}>
                                                        <div className='space-y-2'>
                                                            {Object.entries(overallBalances).map(([unit, quantity]) => (
                                                                <div key={unit} className='flex justify-between items-center'>
                                                                    <div className='flex items-center gap-2'>
                                                                        {getUnitIcon(unit)}
                                                                        <span className={textMuted}>{unit}:</span>
                                                                    </div>
                                                                    <span className={`font-bold ${textColor}`}>{formatNumber(quantity)}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Product Balances Summary */}
                                                <div className='mb-4'>
                                                    <h4 className={`text-sm font-semibold mb-2 ${textMuted}`}>
                                                        Маҳсулот қолдиқлари:
                                                    </h4>
                                                    <div className='space-y-1 max-h-20 overflow-y-auto'>
                                                        {Object.entries(productBalances.balances).slice(0, 3).map(([productName, units]) => (
                                                            <div key={productName} className='flex items-center gap-2 text-xs'>
                                                                <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                                                                <span className={`font-medium ${textColor} truncate`}>{productName}</span>
                                                                <span className={textMuted}>
                                                                    {Object.entries(units).map(([unit, qty]) =>
                                                                        `${formatNumber(qty)} ${unit}`
                                                                    ).join(', ')}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {Object.keys(productBalances.balances).length > 3 && (
                                                            <div className='text-xs text-blue-500 font-medium'>
                                                                + {Object.keys(productBalances.balances).length - 3} та бошқа маҳсулот
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className='flex justify-between items-center pt-4 border-t border-gray-100'>
                                                    <span className={`text-sm ${textMuted}`}>Умумий маҳсулот:</span>
                                                    <span className='font-bold text-blue-600'>
                                                        {formatNumber(client.products?.length || 0)} та
                                                    </span>
                                                </div>
                                            </motion.div>
                                        )
                                    })}
                                </div>

                                {/* Client Pagination */}
                                {totalClientPages > 1 && (
                                    <div className='mt-6 flex justify-center'>
                                        <div className={`rounded-xl shadow-lg p-4 flex items-center gap-4 ${cardBg}`}>
                                            <button
                                                onClick={goToPrevClientPage}
                                                disabled={currentClientPage === 1}
                                                className='flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                                            >
                                                <ChevronLeft size={18} />
                                                Олдинги
                                            </button>

                                            <span className={`font-medium ${textColor}`}>
                                                Саҳифа {currentClientPage} / {totalClientPages}
                                            </span>

                                            <button
                                                onClick={goToNextClientPage}
                                                disabled={currentClientPage === totalClientPages}
                                                className='flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                                            >
                                                Кейинги
                                                <ChevronRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </motion.div>
                )}

                {selectedClient && (() => {
                    const clientStats = calculateClientProductBalances(selectedClient.products || [])
                    const overallBalances = calculateOverallBalances(selectedClient.products || [])
                    const currentHistory = getCurrentHistory()

                    return (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            {/* Client Overview Section */}
                            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6'>
                                {/* Client Info Card */}
                                <div className={`rounded-2xl shadow-lg p-6 border ${cardBg} ${borderColor}`}>
                                    <div className='flex items-center gap-3 mb-4'>
                                        <div className='bg-gradient-to-r from-green-500 to-emerald-500 p-3 rounded-xl'>
                                            <User className='text-white' size={24} />
                                        </div>
                                        <div>
                                            <h2 className={`text-xl font-bold ${textColor}`}>{selectedClient.name}</h2>
                                            <p className={textMuted}>{selectedClient.phoneNumber}</p>
                                        </div>
                                    </div>

                                    <div className='space-y-3'>
                                        <div className={`flex items-center gap-2 text-sm ${textMuted}`}>
                                            <MapPin size={16} />
                                            <span>{selectedClient.address || 'Манзил кўрсатилмаган'}</span>
                                        </div>


                                    </div>
                                </div>

                                {/* Statistics Card */}
                                <div className={`rounded-2xl shadow-lg p-6 border ${cardBg} ${borderColor}`}>
                                    <h3 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
                                        <BarChart3 size={20} className='text-blue-500' />
                                        Статистика
                                    </h3>
                                    <div className='space-y-3'>
                                        <div className='flex justify-between items-center'>
                                            <span className={textMuted}>Жами маҳсулот:</span>
                                            <span className='font-bold text-blue-600'>{formatNumber(clientStats.totalProducts)} та</span>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            <span className={textMuted}>Тайёр маҳсулот:</span>
                                            <span className='font-bold text-green-600'>{formatNumber(clientStats.totalReadyProducts)} та</span>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            <span className={textMuted}>Хом ашё:</span>
                                            <span className='font-bold text-yellow-600'>{formatNumber(clientStats.totalRawProducts)} та</span>
                                        </div>
                                        <div className='flex justify-between items-center'>
                                            <span className={textMuted}>Тарих санавлари:</span>
                                            <span className='font-bold text-purple-600'>{formatNumber(selectedClient.history?.length || 0)} та</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Overall Balances Card */}
                                <div className={`rounded-2xl shadow-lg p-6 border ${cardBg} ${borderColor}`}>
                                    <h3 className={`text-lg font-semibold ${textColor} mb-4 flex items-center gap-2`}>
                                        <Package size={20} className='text-purple-500' />
                                        Умумий қолдиқ
                                    </h3>
                                    <div className='space-y-2'>
                                        {Object.entries(overallBalances).map(([unit, quantity]) => (
                                            <div key={unit} className='flex justify-between items-center'>
                                                <div className='flex items-center gap-2'>
                                                    {getUnitIcon(unit)}
                                                    <span className={textMuted}>{unit}:</span>
                                                </div>
                                                <span className={`font-bold ${textColor}`}>{formatNumber(quantity)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Products Table */}
                            {selectedClient.products?.length === 0 ? (
                                <div className={`rounded-2xl shadow-lg p-12 text-center border ${cardBg} ${borderColor}`}>
                                    <Package className={`mx-auto mb-4 ${dark ? 'text-gray-600' : 'text-gray-400'}`} size={64} />
                                    <h3 className={`text-xl font-semibold mb-2 ${textMuted}`}>
                                        Маҳсулотлар топилмади
                                    </h3>
                                    <p className={textMuted}>
                                        Ушбу мижоз учун ҳеч қандай маҳсулот топилмади.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className={`rounded-2xl shadow-lg border ${cardBg} ${borderColor} overflow-hidden mb-6`}>
                                        <div className='overflow-x-auto'>
                                            <table className='w-full'>
                                                <thead className={`bg-gradient-to-r ${tableHeaderBg}`}>
                                                    <tr>
                                                        <th className={`px-6 py-4 text-left text-sm font-semibold ${tableHeaderText}`}>
                                                            Маҳсулот номи
                                                        </th>
                                                        <th className={`px-6 py-4 text-left text-sm font-semibold ${tableHeaderText}`}>
                                                            ID
                                                        </th>
                                                        <th className={`px-6 py-4 text-left text-sm font-semibold ${tableHeaderText}`}>
                                                            Миқдор
                                                        </th>

                                                        <th className={`px-6 py-4 text-left text-sm font-semibold ${tableHeaderText}`}>
                                                            Ҳолати
                                                        </th>
                                                        <th className={`px-6 py-4 text-left text-sm font-semibold ${tableHeaderText}`}>
                                                            Сана
                                                        </th>
                                                        <th className={`px-6 py-4 text-center text-sm font-semibold ${tableHeaderText}`}>
                                                            Амалиёт
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className={`divide-y ${dark ? 'divide-gray-700' : 'divide-gray-200'}`}>
                                                    {currentProducts.map((product, index) => (
                                                        <motion.tr
                                                            key={product._id}
                                                            initial={{ opacity: 0, y: 10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            transition={{ delay: index * 0.05 }}
                                                            className={tableRowHover}
                                                        >
                                                            <td className='px-6 py-4'>
                                                                <div className='flex items-center gap-3'>
                                                                    <div className='bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-lg'>
                                                                        {getUnitIcon(product.unit)}
                                                                    </div>
                                                                    <div>
                                                                        <div className={`font-medium ${textColor}`}>
                                                                            {product.title}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            <td className={`px-6 py-4 text-sm ${textMuted}`}>
                                                                {product.ID}
                                                            </td>

                                                            <td className='px-6 py-4'>
                                                                <div className='font-bold text-blue-600'>
                                                                    {formatNumber(product.stock)} {product.unit}
                                                                </div>
                                                            </td>



                                                            <td className='px-6 py-4'>
                                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${product.ready
                                                                    ? (dark ? 'bg-green-900 text-green-200 border-green-700' : 'bg-green-100 text-green-800 border-green-200')
                                                                    : (dark ? 'bg-yellow-900 text-yellow-200 border-yellow-700' : 'bg-yellow-100 text-yellow-800 border-yellow-200')
                                                                    }`}>
                                                                    {product.ready ? 'Тайёр' : 'Хом ашё'}
                                                                </div>
                                                            </td>

                                                            <td className={`px-6 py-4 text-sm ${textMuted}`}>
                                                                {new Date(product.createdAt).toLocaleDateString()}
                                                            </td>

                                                            <td className='px-6 py-4'>
                                                                <div className='flex items-center justify-center gap-2'>
                                                                    <motion.button
                                                                        whileHover={{ scale: 1.05 }}
                                                                        whileTap={{ scale: 0.95 }}
                                                                        onClick={() => setSelectedProduct(product)}
                                                                        className='flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200'
                                                                    >
                                                                        <Eye size={16} />
                                                                        Кўриш
                                                                    </motion.button>

                                                                </div>
                                                            </td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Product Pagination */}
                                    {totalProductPages > 1 && (
                                        <div className='mb-6 flex justify-center'>
                                            <div className={`rounded-xl shadow-lg p-4 flex items-center gap-4 ${cardBg}`}>
                                                <button
                                                    onClick={goToPrevProductPage}
                                                    disabled={currentProductPage === 1}
                                                    className='flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                                                >
                                                    <ChevronLeft size={18} />
                                                    Олдинги
                                                </button>

                                                <span className={`font-medium ${textColor}`}>
                                                    Саҳифа {currentProductPage} / {totalProductPages}
                                                </span>

                                                <button
                                                    onClick={goToNextProductPage}
                                                    disabled={currentProductPage === totalProductPages}
                                                    className='flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
                                                >
                                                    Кейинги
                                                    <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}


                        </motion.div>
                    )
                })()}
            </div>

            {/* Product Detail Modal */}
            <AnimatePresence>
                {selectedProduct && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedProduct(null)}
                        className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            onClick={e => e.stopPropagation()}
                            className={`w-full max-w-md rounded-3xl shadow-2xl relative ${modalBg}`}
                        >
                            <button
                                onClick={() => setSelectedProduct(null)}
                                className={`absolute top-4 right-4 z-10 rounded-full p-2 shadow-lg transition-colors duration-200 ${dark ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'
                                    }`}
                            >
                                <X size={20} className={textColor} />
                            </button>

                            <div className='p-6'>
                                <div className='text-center mb-6'>
                                    <div className='bg-gradient-to-r from-blue-500 to-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg'>
                                        {getUnitIcon(selectedProduct.unit)}
                                    </div>
                                    <h2 className={`text-xl font-bold ${textColor}`}>
                                        {selectedProduct.title}
                                    </h2>
                                    <p className={textMuted}>ID: {selectedProduct.ID}</p>
                                </div>

                                <div className='space-y-4'>
                                    <div className={`flex justify-between items-center p-3 rounded-xl ${dark ? 'bg-blue-900' : 'bg-blue-50'
                                        }`}>
                                        <span className={textMuted}>Миқдор:</span>
                                        <span className='font-bold text-lg text-blue-600'>
                                            {formatNumber(selectedProduct.stock)} {selectedProduct.unit}
                                        </span>
                                    </div>

                                    {user.role === 'admin' && selectedProduct.price > 0 && (
                                        <div className={`flex justify-between items-center p-3 rounded-xl ${dark ? 'bg-green-900' : 'bg-green-50'
                                            }`}>
                                            <span className={textMuted}>Нархи:</span>
                                            <span className='font-bold text-lg text-green-600'>
                                                {formatNumber(selectedProduct.price)} {selectedProduct.priceType === 'uz' ? 'сўм' : '$'}
                                            </span>
                                        </div>
                                    )}

                                    <div className={`flex justify-between items-center p-3 rounded-xl ${dark ? 'bg-purple-900' : 'bg-purple-50'
                                        }`}>
                                        <span className={textMuted}>Нарх тури:</span>
                                        <span className='font-semibold text-purple-600'>
                                            {selectedProduct.priceType === 'uz' ? 'Сўм' : 'Доллар'}
                                        </span>
                                    </div>

                                    <div className={`flex justify-between items-center p-3 rounded-xl ${dark ? 'bg-yellow-900' : 'bg-yellow-50'
                                        }`}>
                                        <span className={textMuted}>Ҳолати:</span>
                                        <span className={`font-semibold ${selectedProduct.ready ? 'text-green-600' : 'text-yellow-600'
                                            }`}>
                                            {selectedProduct.ready ? 'Тайёр' : 'Хом ашё'}
                                        </span>
                                    </div>

                                    <div className={`flex justify-between items-center p-3 rounded-xl ${dark ? 'bg-gray-700' : 'bg-gray-50'
                                        }`}>
                                        <span className={textMuted}>Қўшилган:</span>
                                        <span className={`text-sm ${textMuted}`}>
                                            {new Date(selectedProduct.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>


        </div>
    )
}