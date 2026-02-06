import { useState, useContext, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  X,
  Loader2,
  Save,
  UserPlus,
  Shield,
  UserCog2,
  ArrowLeft,
  User,
  Phone,
  Key,
  Info,
  Eye,
  Package,
  CheckCircle,
  Upload,
  Image,
  Trash2
} from 'lucide-react'
import Fetch from '../middlewares/fetcher'
import { ContextData } from '../contextData/Context'
import { api } from '../assets/js/f'

export const UserManagement = () => {
  const { id, admin } = useParams()
  const navigate = useNavigate()
  const { user, setUser, setOpenX, dark } = useContext(ContextData)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [adminData, setAdminData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '+998',
    role: 'worker',
    password: '',
    avatar: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [showImageModal, setShowImageModal] = useState(false)
  const [previewImage, setPreviewImage] = useState('')

  // ImgBB API key - .env faylidan olishingiz mumkin

  useEffect(() => {
    if (id) {
      setIsEditing(true)
      fetchAdminData()
    }
    if (admin) {
      setAdminData({
        firstName: '',
        lastName: '',
        phoneNumber: '+998',
        role: 'admin',
        password: '',
        ability: 'both',
        avatar: ''
      })
    }
  }, [id, admin])

  const fetchAdminData = async () => {
    try {
      setIsLoading(true)
      const { data } = await Fetch.get(`/users/${id}`)
      setAdminData({
        firstName: data.data.firstName || '',
        lastName: data.data.lastName || '',
        phoneNumber: data.data.phoneNumber || '+998',
        role: data.data.role || 'worker',
        password: '',
        ability: data.data.ability || 'both',
        avatar: data.data.avatar || ''
      })
    } catch (error) {
      setError('Сервер хатоси. Илтимос кейинроқ уриниб кўринг!')
    } finally {
      setIsLoading(false)
    }
  }

  const uploadImage = async (file) => {
    try {
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${api}`,
        {
          method: 'POST',
          body: formData
        }
      )

      const data = await response.json()

      if (data && data.data && data.data.url) {
        return data.data.url
      }

      throw new Error('Rasm yuklashda xatolik')
    } catch (error) {
      console.error('Rasm yuklashda xatolik:', error)
      throw error
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // File validation
    if (!file.type.startsWith('image/')) {
      setError('Фақат расм файлларини юклаш мумкин!')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      setError('Расм ҳажми 5MB дан ошмаслиги керак!')
      return
    }

    try {
      setIsUploading(true)
      setError('')

      const imageUrl = await uploadImage(file)
      setAdminData(prev => ({ ...prev, avatar: imageUrl }))
      setSuccess('Расм муваффақиятли юкланди!')

      setTimeout(() => setSuccess(''), 3000)
    } catch (error) {
      setError('Расм юклашда хато. Илтимос қайта уриниб кўринг!')
    } finally {
      setIsUploading(false)
    }
  }

  const handleRemoveImage = () => {
    setAdminData(prev => ({ ...prev, avatar: '' }))
    setSuccess('Расм ўчирилди!')
    setTimeout(() => setSuccess(''), 3000)
  }

  const handlePreviewImage = () => {
    if (adminData.avatar) {
      setPreviewImage(adminData.avatar)
      setShowImageModal(true)
    }
  }

  const handleInputChange = e => {
    const { name, value } = e.target
    setAdminData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async e => {
    e.preventDefault()

    // Валидация
    if (!adminData.firstName || !adminData.lastName) {
      setError('Исм ва фамилия киритилиши шарт!')
      return
    }

    if (!adminData.phoneNumber.match(/^\+998\d{9}$/)) {
      setError('Телефон рақамни тўғри киритинг (+998 xx xxx xx xx)')
      return
    }

    if (adminData.password && adminData.password.length < 8) {
      setError('Пароль камида 8 та белгидан иборат бўлиши керак!')
      return
    }

    // Agar admin bo'lsa, ability har doim 'both' bo'ladi
    const submitData = {
      ...adminData,
      ...(adminData.role === 'admin' && { ability: 'both' })
    }

    try {
      setIsSubmitting(true)
      setError('')

      if (isEditing && !submitData.password) {
        delete submitData.password
      }

      if (isEditing) {
        const { data } = await Fetch.put(`users/${id}`, submitData)
        if (data?.data._id === user._id) {
          setUser(data.data)
        }
        setSuccess('Маълумотлар муваффақиятли янгиланди!')
      } else {
        await Fetch.post('users/register', submitData)
        setSuccess('Янги фойдаланувчи муваффақиятли қўшилди!')
      }

      setTimeout(() => {
        navigate(-1)
      }, 1500)
    } catch (error) {
      setError(
        error.response?.data?.message ||
        'Сервер хатоси. Илтимос кейинроқ уриниб кўринг!'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  // Dark mode styles
  const bgColor = dark ? 'bg-gray-900' : 'bg-gray-50'
  const cardBg = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  const textColor = dark ? 'text-white' : 'text-gray-800'
  const textMuted = dark ? 'text-gray-300' : 'text-gray-600'
  const inputBg = dark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
  const buttonSecondary = dark ? 'bg-gray-700 hover:bg-gray-600 text-white border-gray-600' : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'
  const headerBg = dark ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-100'
  const infoBg = dark ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-100'
  const warningBg = dark ? 'bg-red-900 border-red-700' : 'bg-red-50 border-red-200'
  const successBg = dark ? 'bg-green-900 border-green-700' : 'bg-green-50 border-green-100'
  const purpleBg = dark ? 'bg-purple-900 border-purple-700' : 'bg-purple-50 border-purple-100'
  const modalBg = dark ? 'bg-gray-900/90' : 'bg-black/50'

  if (isEditing && id !== user?._id) {
    return (
      <div className={`min-h-screen pt-20 flex items-center justify-center px-4 ${bgColor}`}>
        <div className={`max-w-md w-full mx-auto rounded-xl shadow-lg overflow-hidden border ${cardBg}`}>
          <div className='p-6 text-center'>
            <div className='mb-4'>
              <Shield className='h-12 w-12 text-red-500 mx-auto' />
            </div>
            <p className={`mb-4 text-sm ${textMuted}`}>
              Сизда бошқа фойдаланувчиларни таҳрирлаш ҳуқуқи мавжуд эмас
            </p>
            <button
              onClick={() => navigate(-1)}
              className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors text-sm font-medium'
            >
              Орқага қайтиш
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen w-full px-4 py-6 ${bgColor}`}>
      {/* Image Preview Modal */}
      {showImageModal && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${modalBg}`}>
          <div className={`relative rounded-xl shadow-2xl max-w-2xl max-h-[90vh] overflow-hidden ${dark ? 'bg-gray-800' : 'bg-white'}`}>
            <button
              onClick={() => setShowImageModal(false)}
              className={`absolute top-4 right-4 z-10 p-2 rounded-full ${dark ? 'bg-gray-900/80 text-white hover:bg-gray-700' : 'bg-white/80 text-gray-800 hover:bg-white'}`}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={previewImage}
              alt="Avatar preview"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}

      <div className='mx-auto max-w-2xl'>


        <div className={`rounded-xl shadow-lg overflow-hidden border ${cardBg}`}>
          {/* Form Header */}
          <div className={`px-6 py-4 border-b ${headerBg}`}>
            <div className='flex items-center gap-3'>
              <div className='bg-blue-500 p-2 rounded-lg'>
                <UserCog2 className='h-5 w-5 text-white' />
              </div>
              <div>
                <h2 className={`text-lg font-semibold ${textColor}`}>
                  {isEditing
                    ? 'Фойдаланувчи Маълумотлари'
                    : 'Янги Фойдаланувчи'}
                </h2>
                <p className={`text-xs ${textMuted}`}>
                  {isEditing
                    ? 'Маълумотларни таҳрирланг'
                    : 'Янги фойдаланувчи қўшинг'}
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className='p-6 space-y-6 flex-wrap'>
            {/* Avatar Section - Only for Editing */}
            {isEditing && (
              <div className='space-y-3'>
                <label className={`block text-sm font-medium flex items-center gap-1 ${textColor}`}>
                  <Image className='h-4 w-4 text-purple-500' />
                  Профил Расми
                </label>

                <div className='flex items-center gap-4'>
                  {/* Avatar Preview */}
                  <div className='relative group'>
                    <div
                      className={`w-20 h-20 rounded-full overflow-hidden border-2 ${adminData.avatar ? 'border-blue-500 cursor-pointer' : 'border-dashed border-gray-400'} ${dark ? 'bg-gray-700' : 'bg-gray-100'}`}
                      onClick={handlePreviewImage}
                    >
                      {adminData.avatar ? (
                        <img
                          src={adminData.avatar}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className={`h-8 w-8 ${dark ? 'text-gray-500' : 'text-gray-400'}`} />
                        </div>
                      )}
                    </div>

                    {/* Hover overlay for actions */}
                    {adminData.avatar && (
                      <div className="absolute inset-0 bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={handlePreviewImage}
                          className="p-1 bg-white/20 hover:bg-white/30 rounded-full"
                        >
                          <Eye className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Upload Controls */}
                  <div className='flex-1 space-y-2'>
                    <div className={`flex items-center gap-2 p-3 rounded-lg border ${dark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                      <label className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="avatar-upload"
                        />
                        <div className={`flex items-center justify-center  gap-2 px-4 py-2 rounded-lg cursor-pointer transition-colors ${dark ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                          {isUploading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                            </>
                          ) : (
                            <>
                              <Upload className="h-4 w-4" />
                            </>
                          )}
                        </div>
                      </label>

                      {adminData.avatar && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className={`px-4 py-2 rounded-lg border transition-colors ${dark ? 'bg-red-900/50 hover:bg-red-800 border-red-700 text-red-200' : 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Form Fields */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {/* First Name */}
              <div className='space-y-2'>
                <label className={`block text-sm font-medium flex items-center gap-1 ${textColor}`}>
                  <User className='h-4 w-4 text-blue-500' />
                  Исм
                  <span className='text-red-500 font-bold'>*</span>
                </label>
                <input
                  className={`w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm ${inputBg}`}
                  type='text'
                  name='firstName'
                  value={adminData.firstName}
                  onChange={handleInputChange}
                  required
                  placeholder='Исмингизни киритинг'
                />
              </div>

              {/* Last Name */}
              <div className='space-y-2'>
                <label className={`block text-sm font-medium flex items-center gap-1 ${textColor}`}>
                  <User className='h-4 w-4 text-blue-500' />
                  Фамилия
                  <span className='text-red-500 font-bold'>*</span>
                </label>
                <input
                  className={`w-full p-3 border rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm ${inputBg}`}
                  type='text'
                  name='lastName'
                  value={adminData.lastName}
                  onChange={handleInputChange}
                  required
                  placeholder='Фамилиянгизни киритинг'
                />
              </div>

              {/* Phone Number */}
              <div className='space-y-2'>
                <label className={`block text-sm font-medium flex items-center gap-1 ${textColor}`}>
                  <Phone className='h-4 w-4 text-green-500' />
                  Телефон
                  <span className='text-red-500 font-bold'>*</span>
                </label>
                <input
                  className={`w-full p-3 border rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all text-sm ${inputBg}`}
                  type='text'
                  name='phoneNumber'
                  value={adminData.phoneNumber}
                  onChange={e => {
                    let value = e.target.value
                    if (!value.startsWith('+998')) {
                      value = '+998' + value.replace(/^\+998/, '')
                    }
                    if (value.length > 13) value = value.slice(0, 13)
                    handleInputChange({
                      target: { name: 'phoneNumber', value }
                    })
                  }}
                  required
                  placeholder='+998901234567'
                />
              </div>

              {/* Role */}
              {!isEditing && (
                <div className='space-y-2'>
                  <label className={`block text-sm font-medium flex items-center gap-1 ${textColor}`}>
                    <Shield className='h-4 w-4 text-orange-500' />
                    Рол
                    <span className='text-red-500 font-bold'>*</span>
                  </label>
                  <select
                    className={`w-full p-3 border rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all text-sm appearance-none ${inputBg}`}
                    name='role'
                    value={adminData.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value='worker'>Ходим</option>
                    <option value='admin'>Админ</option>
                  </select>
                </div>
              )}

              {/* Password */}
              <div className='space-y-2'>
                <label className={`block text-sm font-medium flex items-center gap-1 ${textColor}`}>
                  <Key className='h-4 w-4 text-purple-500' />
                  {isEditing ? (
                    'Янги пароль'
                  ) : (
                    <>
                      Пароль
                      <span className='text-red-500 font-bold'>*</span>
                    </>
                  )}
                </label>
                <input
                  className={`w-full p-3 border rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-100 outline-none transition-all text-sm ${inputBg}`}
                  type='password'
                  name='password'
                  value={adminData.password}
                  onChange={handleInputChange}
                  minLength={isEditing ? 0 : 8}
                  required={!isEditing}
                  placeholder='Камида 8 та белги'
                />
              </div>
            </div>

            {/* Messages */}
            {success && (
              <div className={`p-3 border rounded-lg text-sm flex items-center ${successBg} ${dark ? 'text-green-200' : 'text-green-700'}`}>
                <CheckCircle className='h-4 w-4 mr-2 flex-shrink-0' />
                {success}
              </div>
            )}

            {error && (
              <div className={`p-3 border rounded-lg text-sm flex items-center ${warningBg} ${dark ? 'text-red-200' : 'text-red-600'}`}>
                <X className='h-4 w-4 mr-2 flex-shrink-0' />
                {error}
              </div>
            )}

            {/* Form Actions */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3 pt-4'>
              <button
                type='button'
                onClick={() => navigate(-1)}
                className={`rounded-lg border cursor-pointer flex justify-center items-center gap-2 py-3 font-medium transition-colors text-sm ${buttonSecondary}`}
              >
                <X className='h-4 w-4' />
                Бекор қилиш
              </button>
              <button
                type='submit'
                disabled={isSubmitting || isUploading}
                className={`${isSubmitting || isUploading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-500 hover:bg-blue-600'
                  } rounded-lg text-white py-3 font-medium transition-colors cursor-pointer flex justify-center items-center gap-2 text-sm`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Юкланмоқда...
                  </>
                ) : (
                  <>
                    {isEditing ? (
                      <Save className='h-4 w-4' />
                    ) : (
                      <UserPlus className='h-4 w-4' />
                    )}
                    {isEditing ? 'Сақлаш' : 'Қўшиш'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}