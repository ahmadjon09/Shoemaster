import { useContext } from 'react'
import { ContextData } from '../contextData/Context'

export const LanguageSwitcher = () => {
  const { lang, setLang } = useContext(ContextData)

  const toggleLanguage = () => {
    setLang(lang === 'uzb' ? 'uzk' : 'uzb')
  }

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 font-medium text-sm"
    >
      {lang === 'uzb' ? 'UZB' : 'UZK'}
    </button>
  )
}