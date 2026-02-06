import { X, Info, AlertCircle } from 'lucide-react'
import { useContext } from 'react'
import { ContextData } from '../contextData/Context'

export const AboutModal = () => {
  const { openX, setOpenX, dark } = useContext(ContextData)
  if (!openX) return null

  return (
    <div className='fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-[999] px-4 py-6'>
      <div
        className={`rounded-2xl shadow-2xl w-full max-w-md relative overflow-hidden animate-scale-in
          ${dark ? 'bg-gray-900 text-white' : 'bg-white text-gray-800'}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={dark ? 'bg-gray-800 p-6' : 'bg-gradient-to-r from-blue-500 to-indigo-600 p-6'}>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className={dark ? 'bg-gray-700 p-2 rounded-xl' : 'bg-white/20 p-2 rounded-xl'}>
                <Info size={24} className={dark ? 'text-white' : 'text-white'} />
              </div>
              <h2 className='text-xl font-bold text-white'>{dark ? 'Маълумот' : 'Маълумот'}</h2>
            </div>
            <button
              onClick={() => setOpenX(false)}
              className='p-2 hover:bg-white/20 rounded-xl transition-all duration-200 text-white hover:scale-110'
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className='p-6 space-y-4'>
          <div className='flex items-start gap-3'>
            <div className={dark ? 'bg-gray-700 p-2 rounded-lg mt-0.5' : 'bg-blue-100 p-2 rounded-lg mt-0.5'}>
              <AlertCircle size={18} className={dark ? 'text-blue-400' : 'text-blue-600'} />
            </div>
            <div>
              <p className={dark ? 'text-gray-300 leading-relaxed' : 'text-gray-700 leading-relaxed'}>
                <span className='font-semibold text-red-500'>*</span> – белгиси
                қўйилган майдонларни тўлдириш{' '}
                <span className='font-semibold text-blue-600'>мажбурий</span>.
              </p>
            </div>
          </div>

          <div className={`${dark ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'} rounded-xl p-4 border`}>
            <h3 className='font-semibold text-sm mb-2 flex items-center gap-2'>
              <Info size={16} className={dark ? 'text-gray-400' : 'text-gray-600'} />
              Қўшимча маълумот:
            </h3>
            <ul className='text-sm space-y-1'>
              <li className='flex items-center gap-2'>
                <div className='w-1.5 h-1.5 bg-blue-500 rounded-full'></div>
                Мажбурий майдонларсиз форма тўлиқ сақланмайди
              </li>
              <li className='flex items-center gap-2'>
                <div className='w-1.5 h-1.5 bg-green-500 rounded-full'></div>
                Мажбурий бўлмаган майдонлар ихтиёрий
              </li>
            </ul>
          </div>

          <div className='border-t pt-4'>
            <p className={dark ? 'text-gray-400 text-xs text-center' : 'text-gray-500 text-xs text-center'}>
              💡 <strong>Мисол:</strong> "Номи" майдони ҳар доим мажбурий
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className={`${dark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'} px-6 py-4 border-t`}>
          <button
            onClick={() => setOpenX(false)}
            className='w-full bg-blue-500 text-white py-3 rounded-xl font-semibold hover:bg-blue-600 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-[1.02]'
          >
            Тушунарли
          </button>
        </div>
      </div>
    </div>
  )
}

// CSS animatsiya qo'shish
const styles = `
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
.animate-scale-in { animation: scale-in 0.2s ease-out; }
`
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style')
  styleSheet.innerText = styles
  document.head.appendChild(styleSheet)
}
