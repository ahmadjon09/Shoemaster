import { useState, useContext, useMemo, useEffect, useCallback } from 'react'
import useSWRInfinite from 'swr/infinite'
import useSWR from 'swr'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Loader2,
  Save,
  Trash2,
  ScrollText,
  Eye,
  X,
  User,
  MapPin,
  ShoppingCart,
  ChevronLeft,
  Package,
  Search,
  CheckCircle,
  Clock,
  AlertCircle,
  Edit,
  ChevronRight,
  RefreshCw,
  MoreVertical,
  Phone,
  Mail,
  Building,
  Calendar,
  DollarSign,
  CreditCard,
  Check,
  XCircle
} from 'lucide-react'
import Fetch from '../middlewares/fetcher'
import { ContextData } from '../contextData/Context'
import { ClientEditModal } from '../components/ClientEditModal'
import { Link, useNavigate } from 'react-router-dom'
const CLIENTS_PER_PAGE = 20
const ORDERS_PER_PAGE = 10

export const Orders = () => {
  const { user } = useContext(ContextData)

  // State lar
  const [isOpen, setIsOpen] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [hideButton, setHideButton] = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(null)

  // Search state lar
  const [searchPhone, setSearchPhone] = useState('')
  const [searchName, setSearchName] = useState('')

  const getClientsKey = (pageIndex, previousPageData) => {
    if (previousPageData && !previousPageData.data) return null

    const params = new URLSearchParams({
      page: pageIndex + 1,
      limit: CLIENTS_PER_PAGE,
      ...(searchPhone && { phone: searchPhone }),
      ...(searchName && { name: searchName })
    })

    return `/clients?${params}`
  }

  const {
    data: clients,
    error: clientsError,
    isLoading: clientsLoading,
    size: clientsPage,
    setSize: setClientsPage,
    mutate: mutateClients
  } = useSWRInfinite(getClientsKey, Fetch)

  const clientsData = clients?.data

  // Client orders uchun alohida fetch
  const getClientOrdersKey = () => {
    if (!selectedClient._id) return null

    return `/clients/${selectedClient._id}/orders?page=${orderPage}&limit=${ORDERS_PER_PAGE}`
  }
  const [orderPage, setOrderPage] = useState(1)

  const {
    data: clientOrders,
    error: clientOrdersError,
    isLoading: clientOrdersLoading,
    mutate: mutateClientOrders
  } = useSWR(getClientOrdersKey, Fetch)

  const clientOrdersData = clientOrders


  useEffect(() => {
    setOrderPage(1);
  }, [selectedClient?._id]);

  const allClients = useMemo(() => {
    if (!clients) return [];

    return clients.flatMap(page => page.data?.data.clients);
  }, [clients]);


  const calculateClientStats = useCallback((client) => {
    return {
      totalOrders: client.totalOrders || 0,
      totalAmount: client.totalAmount || 0,
      unpaidOrders: client.unpaidOrders || 0
    }
  }, [])

  const handleEditClient = async (clientId, updatedData) => {
    try {
      await Fetch.put(`/clients/${clientId}`, updatedData)
      mutateClients()

      if (selectedClient?._id === clientId) {
        setSelectedClient(prev => ({ ...prev, ...updatedData }))
      }

      return { success: true }
    } catch (error) {
      console.error('Client edit error:', error)
      return { success: false, error: error.message }
    }
  }

  const handleDeleteClient = async (clientId) => {
    if (!clientId || user.role !== 'admin') return

    if (deleting === clientId) return

    const client = allClients.find(c => c._id === clientId)
    if (!client) {
      alert("❌ Клиент топилмади")
      return
    }

    const confirm1 = window.confirm(
      `⚠️ ДИҚҚАТ!\n\nСиз ростан ҳам "${client.fullName}" мижозини ўчирмоқчимисиз?`
    )
    if (!confirm1) return

    const confirm2 = window.confirm(
      `❗ ОХИРГИ ОГОҲЛАНТИРИШ!\n\nБу мижозга тегишли БАРЧА буюртмалар ҳам ўчирилади.\nБу амални ОРҚАГА ҚАЙТАРИБ БЎЛМАЙДИ!`
    )
    if (!confirm2) return

    setDeleting(clientId)

    try {
      await Fetch.delete(`/clients/${clientId}`)

      // Optimistic update
      mutateClients(currentData => {
        return currentData?.map(page => ({
          ...page,
          data: {
            ...page.data,
            clients: page.data?.clients?.filter(c => c._id !== clientId) || []
          }
        }))
      })

      if (selectedClient?._id === clientId) {
        setSelectedClient(null)
      }

      alert(`✅ "${client.fullName}" ва барча буюртмалари ўчирилди`)
    } catch (err) {
      console.error("Delete client error:", err)
      alert("❌ Ўчиришда хатолик юз берди.")
    } finally {
      setDeleting(null)
      setShowDeleteMenu(null)
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (!orderId || user.role !== 'admin') return

    const confirmMessage = `⚠️ Сиз ростдан ҳам чиқимсини бекор қилмоқчимисиз?\n\nБу амални кейин тиклаб бўлмайди!`
    if (!window.confirm(confirmMessage)) return

    try {
      setDeleting(orderId)
      await Fetch.delete(`/orders/${orderId}`)

      // Optimistic update
      mutateClientOrders(currentData => {
        if (!currentData) return currentData

        return {
          ...currentData,
          data: {
            ...currentData.data,
            orders: currentData.data.orders?.filter(o => o._id !== orderId) || []
          }
        }
      })

      if (selectedOrder?._id === orderId) {
        setSelectedOrder(null)
      }

      alert('✅ чиқим муваффақиятли ўчирилди')
    } catch (err) {
      console.error('Cancel error:', err)
      alert('❌ чиқимни бекор қилишда хатолик юз берди.')
    } finally {
      setDeleting(null)
    }
  }

  // Load more clients
  const loadMoreClients = () => {
    setClientsPage(clientsPage + 1)
  }

  const getStatusConfig = useCallback(status => {
    const statusLower = status?.toLowerCase()

    switch (statusLower) {
      case 'completed':
      case 'бажарилган':
        return {
          icon: <CheckCircle className='text-green-500' size={16} />,
          color: 'bg-green-100 text-green-800 border-green-200',
          text: 'Бажарилган'
        }
      case 'pending':
      case 'кутилмоқда':
      case 'янги':
        return {
          icon: <Clock className='text-yellow-500' size={16} />,
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          text: 'Кутилмоқда'
        }
      case 'cancelled':
      case 'бекор қилинган':
        return {
          icon: <XCircle className='text-red-500' size={16} />,
          color: 'bg-red-100 text-red-800 border-red-200',
          text: 'Бекор қилинган'
        }
      default:
        return {
          icon: <AlertCircle className='text-gray-500' size={16} />,
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          text: status || '—'
        }
    }
  }, [])

  // Xato holati
  if (clientsError) {
    return (
      <div className='min-h-screen flex items-center justify-center bg-white'>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className='text-center p-8 rounded-2xl border max-w-md bg-red-50 border-red-200'
        >
          <AlertCircle className='mx-auto text-red-500 mb-4' size={48} />
          <h3 className='text-lg font-semibold mb-2 text-red-800'>
            Юклашда хатолик
          </h3>
          <p className='text-red-600'>
            Мижозлар маълумотларини юклашда хатолик юз берди.
          </p>
        </motion.div>
      </div>
    )
  }
  const navigate = useNavigate()
  return (
    <div className='min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6 transition-colors duration-300'>
      <div className='mx-auto space-y-6'>
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className='rounded-2xl shadow-lg p-6 border bg-white border-gray-200'
        >
          <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4'>
            <div className='flex items-center gap-4 flex-wrap'>
              {selectedClient ? (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => {
                    setSelectedClient(null)
                    setOrderPage(1)
                  }}
                  className='flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100'
                >
                  <ChevronLeft size={20} />
                  Орқага
                </motion.button>
              ) : (
                <div className='bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl shadow-lg'>
                  <ShoppingCart className='text-white' size={28} />
                </div>
              )}
              <div>
                <h1 className='text-2xl md:text-3xl font-bold text-gray-800'>
                  {selectedClient ? `${selectedClient.fullName} ҳаридлари` : 'Мижозлар'}
                </h1>
                <p className='text-gray-600 mt-1'>
                  {selectedClient
                    ? `${selectedClient?.totalOrders || 0} та чиқим`
                    : ``}
                </p>
              </div>
            </div>

            <div className='flex flex-col sm:flex-row gap-3 w-full lg:w-auto'>
              <button
                onClick={() => navigate("/addorder/empty/empty/empty")}
                className='flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold'
              >
                <Plus size={20} />
                Янги мижоз
              </button>
            </div>
          </div>
        </motion.div>

        {/* Search Section */}
        {!selectedClient && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className='rounded-2xl shadow-lg p-6 border bg-white border-gray-200'
          >
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <div className='relative'>
                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={20} />
                <input
                  type='text'
                  placeholder='Телефон рақам...'
                  value={searchPhone}
                  onChange={e => setSearchPhone(e.target.value)}
                  className='w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 border-gray-300'
                />
              </div>

              <div className='relative'>
                <User className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400' size={20} />
                <input
                  type='text'
                  placeholder='Мижоз Ф.И.Ш...'
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                  className='w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 bg-gray-50 border-gray-300'
                />
              </div>

              <button
                onClick={() => {
                  setSearchPhone('')
                  setSearchName('')
                  mutateClients()
                }}
                className='flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-all duration-300'
              >
                <RefreshCw size={16} />
                Тозалаш
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {clientsLoading && !allClients.length && (
          <div className='flex justify-center py-12'>
            <Loader2 className='animate-spin text-blue-500' size={32} />
          </div>
        )}

        {/* Clients List */}
        {!selectedClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {allClients.length === 0 ? (
              <div className='rounded-2xl shadow-lg p-12 text-center border bg-white border-gray-200'>
                <User className='mx-auto mb-4 text-gray-400' size={64} />
                <h3 className='text-xl font-semibold mb-2 text-gray-600'>
                  Мижозлар топилмади
                </h3>
                <p className='text-gray-600'>
                  Ҳали ҳеч қандай мижоз мавжуд эмас
                </p>
              </div>
            ) : (
              <>
                <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'>
                  {allClients.map((client, index) => {
                    const stats = calculateClientStats(client)

                    return (
                      <motion.div
                        key={client._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className='relative rounded-2xl shadow-lg p-6 border hover:shadow-xl transition-all duration-300 bg-white border-gray-200 hover:border-blue-300'
                      >
                        {/* Client info with click */}
                        <div
                          onClick={() => {
                            setSelectedClient(client)
                            setOrderPage(1)
                          }}
                          className='cursor-pointer'
                        >
                          <div className='flex items-start gap-3 mb-4'>
                            <div className='bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl shadow-md'>
                              <User className='text-white' size={24} />
                            </div>
                            <div className='flex-1'>
                              <h3 className='font-bold text-lg text-gray-800'>{client.fullName || 'Номаълум'}</h3>
                              <div className='flex items-center gap-2 text-sm text-gray-600'>
                                <Phone size={14} />
                                <span>{client.phoneNumber}</span>
                              </div>
                              {client.address && (
                                <div className='flex items-center gap-2 text-sm text-gray-600 mt-1'>
                                  <MapPin size={14} />
                                  <span>{client.address}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className='space-y-2 mb-4'>
                            <div className='flex justify-between items-center'>
                              <span className='text-sm text-gray-600'>Жами сумма:</span>
                              <span className='font-bold text-green-600'>{stats.totalAmount.toLocaleString()} сўм</span>
                            </div>
                            <div className='flex justify-between items-center'>
                              <span className='text-sm text-gray-600'>Жами буюртма:</span>
                              <span className='font-bold text-blue-600'>{stats.totalOrders} та</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className='flex justify-between items-center pt-4 border-t border-gray-200'>
                          <button
                            onClick={() => setEditingClient(client)}
                            className='flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors'
                          >
                            <Edit size={14} />
                            Таҳрирлаш
                          </button>

                          {user.role === 'admin' && (
                            <div className='relative'>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setShowDeleteMenu(showDeleteMenu === client._id ? null : client._id)
                                }}
                                className='p-2 hover:bg-gray-100 rounded-lg transition-colors'
                              >
                                <MoreVertical size={18} className='text-gray-500' />
                              </button>

                              <AnimatePresence>
                                {showDeleteMenu === client._id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className='absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 z-10 min-w-[120px]'
                                  >
                                    <button
                                      onClick={() => handleDeleteClient(client._id)}
                                      className='flex items-center gap-2 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors'
                                    >
                                      <Trash2 size={14} />
                                      <span>Ўчириш</span>
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>

                {/* Load more button */}
                {clientsData?.[clientsData.length - 1]?.data?.hasMore && (
                  <div className='mt-6 flex justify-center'>
                    <button
                      onClick={loadMoreClients}
                      disabled={clientsLoading}
                      className='px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl hover:shadow-lg transition-all duration-300 disabled:opacity-50'
                    >
                      {clientsLoading ? (
                        <Loader2 className='animate-spin mx-auto' size={20} />
                      ) : (
                        'Кўпроқ юклаш'
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Client Orders */}
        {selectedClient && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            {/* Client Overview Section */}
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6'>
              {/* Client Info Card */}
              <div className='rounded-2xl shadow-lg p-6 border bg-white border-gray-200'>
                <div className='flex items-center justify-between mb-4'>
                  <div className='flex items-center gap-3'>
                    <div className='bg-gradient-to-r from-blue-500 to-indigo-500 p-3 rounded-xl'>
                      <User className='text-white' size={24} />
                    </div>
                    <div>
                      <h2 className='text-xl font-bold text-gray-800'>{selectedClient.fullName || 'Номаълум'}</h2>
                      <div className='flex items-center gap-2 text-gray-600'>
                        <Phone size={14} />
                        <span>{selectedClient.phoneNumber}</span>
                      </div>
                    </div>
                  </div>
                  <div className='flex gap-2 '>
                    <button
                      onClick={() => setEditingClient(selectedClient)}
                      className='p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600'
                      title="Таҳрирлаш"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => {
                        mutateClientOrders()
                      }}
                      className='p-2 rounded-lg bg-gray-100 hover:bg-gray-200'
                      title="Янгилаш"
                    >
                      <RefreshCw size={16} className='text-gray-800' />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Add Order Button */}
            <div className='mb-6'>
              <Link
                to={`/addorder/${selectedClient._id}/${encodeURIComponent(selectedClient.fullName || '')}/${selectedClient.phoneNumber}`}
                className='inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 font-semibold'
              >
                <Plus size={20} />
                Янги чиқим
              </Link>
            </div>

            {/* Orders Table */}
            {clientOrdersLoading ? (
              <div className='flex justify-center py-12'>
                <Loader2 className='animate-spin text-blue-500' size={32} />
              </div>
            ) : clientOrdersData?.data?.orders?.length === 0 ? (
              <div className='rounded-2xl shadow-lg p-12 text-center border bg-white border-gray-200'>
                <ScrollText className='mx-auto mb-4 text-gray-400' size={64} />
                <h3 className='text-xl font-semibold mb-2 text-gray-600'>
                  чиқимлар топилмади
                </h3>
                <p className='text-gray-600'>
                  Ушбу мижоз учун ҳеч қандай чиқим топилмади.
                </p>
              </div>
            ) : (
              <div className='rounded-2xl shadow-lg border overflow-hidden bg-white border-gray-200'>
                <div className='overflow-x-auto'>
                  <table className='w-full'>
                    <thead className='bg-gradient-to-r from-gray-50 to-gray-100'>
                      <tr>
                        <th className='px-6 py-4 text-left text-sm font-semibold text-gray-700'>Маҳсулотлар</th>
                        <th className='px-6 py-4 text-left text-sm font-semibold text-gray-700'>Ҳолат</th>
                        <th className='px-6 py-4 text-left text-sm font-semibold text-gray-700'>Умумий нарх</th>
                        <th className='px6 py-4 text-left text-sm font-semibold text-gray-700'>Сана</th>
                        <th className='px-6 py-4 text-center text-sm font-semibold text-gray-700'>Амалиёт</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-200'>
                      {clientOrdersData?.data?.data.orders?.map((order, index) => {
                        const total = order.total || 0
                        const statusConfig = getStatusConfig(order.status)

                        return (
                          <motion.tr
                            key={order._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <td className='px-6 py-4'>
                              <div className='space-y-1'>
                                {(order.products || []).slice(0, 3).map((item, i) => (
                                  <div key={i} className='text-sm text-gray-700'>
                                    <span className='font-medium'>{item.product?.title || 'Мавжуд эмас'}</span>
                                    <span className='ml-2 text-gray-500'>
                                      {item.quantity} × {item.price?.toLocaleString() || 0} сўм
                                    </span>
                                  </div>
                                ))}
                                {(order.products || []).length > 3 && (
                                  <div className='text-xs text-blue-500 font-medium'>
                                    + {(order.products || []).length - 3} та бошқа маҳсулот
                                  </div>
                                )}
                              </div>
                            </td>

                            <td className='px-6 py-4'>
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${statusConfig.color}`}>
                                {statusConfig.icon}
                                {statusConfig.text}
                              </div>
                            </td>

                            <td className='px-6 py-4'>
                              <div className='space-y-1'>
                                <div className='font-bold text-green-600 text-sm'>
                                  {total.toLocaleString()} сўм
                                </div>
                              </div>
                            </td>
                            <td className='px-6 py-4 text-sm text-gray-600'>
                              {new Date(order.orderDate || order.createdAt).toLocaleDateString()}
                            </td>

                            <td className='px-6 py-4'>
                              <div className='flex items-center justify-center gap-2'>
                                <button
                                  onClick={() => setSelectedOrder(order)}
                                  className='flex items-center gap-2 bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200'
                                >
                                  <Eye size={16} />
                                </button>

                                {user.role === 'admin' && (
                                  <button
                                    onClick={() => handleDeleteOrder(order._id)}
                                    disabled={deleting === order._id}
                                    className='flex items-center gap-2 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors duration-200'
                                  >
                                    {deleting === order._id ? (
                                      <Loader2 className='animate-spin' size={16} />
                                    ) : (
                                      <Trash2 size={16} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Orders Pagination */}
                {clientOrdersData?.data?.totalPages > 1 && (
                  <div className='p-4 border-t border-gray-200 bg-gray-50'>
                    <div className='flex items-center justify-between'>
                      <div className='text-sm text-gray-600'>
                        Кўрсатилган: {((orderPage - 1) * ORDERS_PER_PAGE) + 1}-{Math.min(orderPage * ORDERS_PER_PAGE, clientOrdersData.data.total)}/{clientOrdersData.data.total}
                      </div>

                      <div className='flex items-center gap-2'>
                        <button
                          onClick={() => setOrderPage(prev => Math.max(prev - 1, 1))}
                          disabled={orderPage <= 1}
                          className='flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800'
                        >
                          <ChevronLeft size={18} />
                          Олдинги
                        </button>

                        <div className='flex items-center gap-1'>
                          {Array.from({ length: Math.min(5, clientOrdersData.data.totalPages) }, (_, i) => {
                            let pageNum
                            if (clientOrdersData.data.totalPages <= 5) {
                              pageNum = i + 1
                            } else if (orderPage <= 3) {
                              pageNum = i + 1
                            } else if (orderPage >= clientOrdersData.data.totalPages - 2) {
                              pageNum = clientOrdersData.data.totalPages - 4 + i
                            } else {
                              pageNum = orderPage - 2 + i
                            }

                            return (
                              <button
                                key={pageNum}
                                onClick={() => setOrderPage(pageNum)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center ${orderPage === pageNum
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
                          onClick={() => setOrderPage(prev => Math.min(prev + 1, clientOrdersData.data.totalPages))}
                          disabled={orderPage >= clientOrdersData.data.totalPages}
                          className='flex items-center gap-1 px-3 py-1 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-800'
                        >
                          Кейинги
                          <ChevronRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <OrderDetailModal
            selectedOrder={selectedOrder}
            setSelectedOrder={setSelectedOrder}
            user={user}
            hideButton={hideButton}
            setHideButton={setHideButton}
            mutateOrders={mutateClientOrders}
          />
        )}
      </AnimatePresence>

      {/* Client Edit Modal */}
      <AnimatePresence>
        {editingClient && (
          <ClientEditModal
            client={editingClient}
            onClose={() => setEditingClient(null)}
            onSave={handleEditClient}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Order Detail Modal komponenti
const OrderDetailModal = ({
  selectedOrder,
  setSelectedOrder,
  user,
  hideButton,
  setHideButton,
  mutateOrders
}) => {
  const [localOrder, setLocalOrder] = useState(selectedOrder)
  const [editing, setEditing] = useState(false)

  const handlePriceChange = (index, field, value) => {
    const updatedProducts = [...localOrder.products]
    if (field === 'price') {
      const numericValue = value === '' ? 0 : Number(value)
      updatedProducts[index] = {
        ...updatedProducts[index],
        price: numericValue
      }
    }
    setLocalOrder(prev => ({ ...prev, products: updatedProducts }))
  }

  const handleSave = async () => {
    try {
      setHideButton(true)

      const total = localOrder.products.reduce((sum, product) => {
        return sum + ((product.price || 0) * (product.quantity || 0))
      }, 0)

      await Fetch.put(`/orders/${localOrder._id}`, {
        products: localOrder.products.map(p => ({
          product: p.product?._id || p.product,
          quantity: p.quantity,
          price: p.price,
          unit: p.unit
        })),
        total: total
      })

      mutateOrders()
      alert('✅ Нархлар муваффақиятли янгиланди')
      setSelectedOrder(null)
    } catch (err) {
      console.error('Update error:', err)
      alert('❌ Нархларни янгилашда хатолик юз берди')
    } finally {
      setHideButton(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={() => setSelectedOrder(null)}
      className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        className='w-full max-w-2xl rounded-3xl shadow-2xl relative max-h-[90vh] overflow-y-auto bg-white'
      >
        <button
          onClick={() => setSelectedOrder(null)}
          className='absolute top-4 right-4 z-10 rounded-full p-2 shadow-lg transition-colors duration-200 bg-white hover:bg-gray-100'
        >
          <X size={20} className='text-gray-800' />
        </button>

        <div className='p-8'>
          <div className='text-center mb-8'>
            <div className='bg-gradient-to-r from-blue-500 to-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg'>
              <ShoppingCart className='text-white' size={28} />
            </div>
            <h2 className='text-2xl font-bold text-gray-800'>чиқим маълумотлари</h2>
            <p className='text-gray-600 mt-2'>
              Буюртма №{selectedOrder._id.slice(-8)}
            </p>
          </div>

          {/* Order Info */}
          <div className='flex gap-1'>
            <div className='flex items-center gap-2 text-gray-600'>
              <Calendar size={16} />
              <span className='text-sm'>Сана:</span>
            </div>
            <p className='font-medium'>
              {new Date(selectedOrder.orderDate || selectedOrder.createdAt).toLocaleDateString()}
            </p>
          </div>


          {/* Mahsulotlar */}
          <div className='mb-8'>
            <div className='flex justify-between items-center mb-4'>
              <h3 className='text-lg font-semibold flex items-center gap-2 text-gray-800'>
                <Package className='text-indigo-600' size={20} />
                Маҳсулотлар ({localOrder.products?.length || 0})
              </h3>
              {/* {user.role === 'admin' && !selectedOrder.paid && (
                <button
                  onClick={() => setEditing(!editing)}
                  className='flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors duration-200'
                >
                  <Edit size={16} />
                  {editing ? 'Бекор қилиш' : 'Нархларни таҳрирлаш'}
                </button>
              )} */}
            </div>

            <div className='space-y-3'>
              {localOrder.products?.map((product, index) => (
                <div key={index} className='flex justify-between items-center p-3 rounded-lg border bg-gray-50 border-gray-200'>
                  <div className='flex-1'>
                    <p className='font-medium text-gray-800'>{product.product?.title || "Номаълум"}</p>
                    <div className='flex items-center gap-4 text-sm text-gray-600'>
                      <span>{product.quantity} дона</span>
                      {product.unit && <span>{product.unit}</span>}
                    </div>
                  </div>

                  {editing ? (
                    <div className='flex items-center gap-2'>
                      <input
                        type='number'
                        value={product.price || ''}
                        onChange={(e) => handlePriceChange(index, 'price', e.target.value)}
                        className='w-24 border rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-right border-gray-300'
                        placeholder='0'
                        min="0"
                      />
                      <span className='text-gray-600'>сўм</span>
                    </div>
                  ) : (
                    <div className='text-right'>
                      <p className='font-semibold text-green-600'>
                        {((product.price || 0) * (product.quantity || 0)).toLocaleString()} сўм
                      </p>
                      <p className='text-xs text-gray-600'>
                        {(product.price || 0).toLocaleString()} сўм дан
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className='border-t border-gray-200 pt-4 mb-8'>
            <div className='flex justify-between items-center'>
              <span className='text-lg font-semibold text-gray-800'>Жами:</span>
              <span className='text-xl font-bold text-green-600'>
                {localOrder.products?.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 0)), 0).toLocaleString()} сўм
              </span>
            </div>
          </div>

          {/* Save button */}
          {editing && (
            <div className='flex justify-end gap-3'>
              <button
                onClick={() => setEditing(false)}
                className='px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200'
              >
                Бекор қилиш
              </button>
              <button
                onClick={handleSave}
                disabled={hideButton}
                className='flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition-colors duration-200 disabled:opacity-50'
              >
                {hideButton ? (
                  <Loader2 className='animate-spin' size={16} />
                ) : (
                  <Save size={16} />
                )}
                {hideButton ? 'Сақланмоқда...' : 'Сақлаш'}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}