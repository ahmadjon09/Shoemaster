import { useContext } from "react"
import { ContextData } from "../contextData/Context"

export const LoadingState = () => {
  const { dark } = useContext(ContextData)

  return (
    <div className="flex flex-col items-center justify-center py-12">
      {/* Loader */}
      <div
        className={`w-16 h-16 border-4 rounded-full animate-spin mb-4 ${dark
          ? 'border-gray-700 border-t-gray-300'
          : 'border-blue-200 border-t-blue-600'
          }`}
      ></div>

      {/* Text */}
      <p className={`text-center text-lg ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
        Юкланмоқда...
      </p>
    </div>
  )
}
