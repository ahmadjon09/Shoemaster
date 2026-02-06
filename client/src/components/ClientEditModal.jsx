// ClientEditModal.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { X, User, Phone, MapPin, Mail, Building, Save, Loader2 } from 'lucide-react'

export const ClientEditModal = ({ client, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        fullName: client.fullName || '',
        phoneNumber: client.phoneNumber || '',
    })

    const [loading, setLoading] = useState(false)
    const [errors, setErrors] = useState({})

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }))
        }
    }

    const validateForm = () => {
        const newErrors = {}

        if (!formData.fullName.trim()) {
            newErrors.fullName = 'Ф.И.Ш киритиш мажбурий'
        }

        if (!formData.phoneNumber.trim()) {
            newErrors.phoneNumber = 'Телефон рақам киритиш мажбурий'
        }

        return newErrors
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        const validationErrors = validateForm()
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors)
            return
        }

        setLoading(true)

        try {
            const result = await onSave(client._id, formData)

            if (result.success) {
                onClose()
            } else {
                alert('❌ Хатолик: ' + (result.error || 'Номаълум хатолик'))
            }
        } catch (error) {
            console.error('Save error:', error)
            alert('❌ Маълумотларни сақлашда хатолик юз берди')
        } finally {
            setLoading(false)
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                onClick={e => e.stopPropagation()}
                className='w-full max-w-md rounded-3xl shadow-2xl relative bg-white'
            >
                <button
                    onClick={onClose}
                    className='absolute top-4 right-4 z-10 rounded-full p-2 shadow-lg transition-colors duration-200 bg-white hover:bg-gray-100'
                >
                    <X size={20} className='text-gray-800' />
                </button>

                <div className='p-8'>
                    <div className='text-center mb-6'>
                        <div className='bg-gradient-to-r from-blue-500 to-indigo-500 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3'>
                            <User className='text-white' size={24} />
                        </div>
                        <h2 className='text-2xl font-bold text-gray-800'>Мижозни таҳрирлаш</h2>
                        <p className='text-gray-600 mt-1'>{client.fullName}</p>
                    </div>

                    <form onSubmit={handleSubmit} className='space-y-4'>
                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                <div className='flex items-center gap-2'>
                                    <User size={14} />
                                    Ф.И.Ш *
                                </div>
                            </label>
                            <input
                                type='text'
                                name='fullName'
                                value={formData.fullName}
                                onChange={handleChange}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 ${errors.fullName ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder='Ф.И.Ш'
                            />
                            {errors.fullName && (
                                <p className='text-red-500 text-xs mt-1'>{errors.fullName}</p>
                            )}
                        </div>

                        <div>
                            <label className='block text-sm font-medium text-gray-700 mb-1'>
                                <div className='flex items-center gap-2'>
                                    <Phone size={14} />
                                    Телефон рақам *
                                </div>
                            </label>
                            <input
                                type='tel'
                                name='phoneNumber'
                                value={formData.phoneNumber}
                                onChange={handleChange}
                                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 ${errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                placeholder='+998 XX XXX XX XX'
                            />
                            {errors.phoneNumber && (
                                <p className='text-red-500 text-xs mt-1'>{errors.phoneNumber}</p>
                            )}
                        </div>
                        <div className='flex gap-3 pt-4'>
                            <button
                                type='button'
                                onClick={onClose}
                                className='flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200'
                            >
                                Бекор қилиш
                            </button>
                            <button
                                type='submit'
                                disabled={loading}
                                className='flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-300 disabled:opacity-50'
                            >
                                {loading ? (
                                    <Loader2 className='animate-spin' size={16} />
                                ) : (
                                    <Save size={16} />
                                )}
                                Сақлаш
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    )
}