import { useContext, useEffect, useRef, useState } from 'react'
import { ContextData } from '../contextData/Context'
import useSWR from "swr"
import { DollarSign, RefreshCw } from 'lucide-react';

const fetcher = (url) => fetch(url).then(res => { if (!res.ok) throw new Error('API хатоси'); return res.json() })
export const USDToUZSWidget = ({ position = 'bottom-right', refreshInterval = 60000 }) => {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [kurs, setKurs] = useState()
    const modalRef = useRef(null)

    const { dark } = useContext(ContextData)

    const { data, mutate } = useSWR(
        'https://cbu.uz/uz/arkhiv-kursov-valyut/json/',
        fetcher,
        {
            refreshInterval,
            revalidateOnFocus: true,
        }
    )

    const usd = data?.find(i => i.Ccy === "USD")
    const apiRate = usd?.Rate

    useEffect(() => {
        if (apiRate) setKurs(apiRate)
    }, [apiRate])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsModalOpen(false)
            }
        }

        if (isModalOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        } else {
            document.removeEventListener('mousedown', handleClickOutside)
        }

        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isModalOpen])

    const positionClasses = {
        'bottom-left': 'fixed left-2 bottom-6',
        'bottom-right': 'fixed left-2 bottom-6',
        'top-left': 'fixed left-6 top-6',
        'top-right': 'fixed right-6 top-6'
    }

    return (
        <div className={`${positionClasses[position]} z-50`}>
            {/* Widget */}
            <div
                className={`shadow-lg rounded-xl p-1 cursor-pointer flex items-center space-x-1
                    ${dark ? 'bg-gray-800 text-white' : 'bg-white text-green-700'}`}
                onClick={() => setIsModalOpen(!isModalOpen)}
            >
                <DollarSign size={16} className={dark ? "text-green-400" : "text-green-700"} />
                <span className="font-semibold">
                    {kurs ? Number(kurs).toLocaleString("ru-RU") : '—'} <span className="text-sm">{dark ? 'сўм' : 'cўм'}</span>
                </span>
                <RefreshCw
                    className={`w-4 h-4 ml-2 ${dark ? 'text-gray-400' : 'text-gray-400'}`}
                    onClick={(e) => {
                        e.stopPropagation()
                        mutate()
                    }}
                />
            </div>

            {/* Modal */}
            {isModalOpen && data && (
                <div
                    ref={modalRef}
                    className={`mt-2 w-90 max-h-80 overflow-y-auto border rounded-xl shadow-lg p-3
                        ${dark ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-black border-gray-200'}`}
                >
                    <h3 className="text-sm font-bold mb-2 ">Валюта курслари :</h3>
                    {data.map(item => (
                        <div
                            key={item.Ccy}
                            className={`flex justify-between mb-1 p-1 rounded transition-colors
                                ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                        >
                            <span className="font-medium text-xs">{item.Ccy} ({item.CcyNm_UZ})</span>
                            <div className="text-right">
                                <span className='text-sm'>{Number(item.Rate).toLocaleString("ru-RU")} cўм</span>
                                {item.Diff && (
                                    <span className={`ml-2 text-xs ${item.Diff > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {item.Diff > 0 ? `+${item.Diff}` : item.Diff}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
