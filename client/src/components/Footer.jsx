import { ArrowUp, ExternalLink, Sparkles, Copyright } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { v } from '../assets/js/i'

export const Footer = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [currentYear] = useState(new Date().getFullYear())

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    })
  }

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) setShowScrollTop(true)
      else setShowScrollTop(false)
    }

    window.addEventListener('scroll', toggleVisibility)
    return () => window.removeEventListener('scroll', toggleVisibility)
  }, [])

  useEffect(() => {
    setIsVisible(true)
  }, [])

  const footerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        when: "beforeChildren",
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 }
    }
  }

  const scrollButtonVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 200,
        damping: 15
      }
    },
    hover: { scale: 1.1 },
    tap: { scale: 0.95 }
  }

  return (
    <>
      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            key="scroll-top"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={scrollButtonVariants}
            whileHover="hover"
            whileTap="tap"
            onClick={scrollToTop}
            className="fixed bottom-6 right-6 z-40 p-3 rounded-full shadow-lg backdrop-blur-sm border transition-all duration-300 bg-white/90 border-gray-200 text-gray-700 hover:bg-white"
            aria-label="Наверх"
          >
            <ArrowUp size={18} className="text-blue-600" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Main Footer */}
      <motion.footer
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
        variants={footerVariants}
        className="relative overflow-hidden text-xs py-3 px-4 border-t transition-all duration-300 bg-gradient-to-b from-blue-50/30 to-white border-blue-100 text-gray-600"
      >
        {/* Decorative elements */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute top-0 left-1/4 w-2 h-2 rounded-full bg-blue-400"></div>
          <div className="absolute bottom-2 right-1/3 w-1 h-1 rounded-full bg-purple-400"></div>
          <div className="absolute top-1/3 right-1/4 w-1 h-1 rounded-full bg-pink-400"></div>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Left side - Copyright */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg transition-all duration-300 bg-white/50 border border-blue-100">
              <span className="text-[10px] font-medium text-gray-700">
                © {currentYear}
              </span>
              <span className="w-1 h-1 rounded-full bg-blue-300"></span>
              <span className="text-[10px] text-gray-600">
                Версия {v}
              </span>
            </span>
          </motion.div>

          {/* Center - Brand */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-300 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200">
              <Sparkles size={10} className="text-blue-500" />
              <span className="text-[10px] font-medium text-gray-700">
                Разработано
              </span>
              <a
                href="https://vebox.uz/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold transition-all duration-300 text-blue-600 hover:text-blue-700"
              >
                <span>VEBOX</span>
                <ExternalLink size={10} />
              </a>
            </span>
          </motion.div>

          {/* Right side - Made with love */}
          <motion.div
            variants={itemVariants}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 bg-gradient-to-r from-blue-50 to-rose-50 border border-blue-200"
          >
            <Copyright
              size={10}
              className="animate-pulse text-blue-500"
            />
            <span className="text-[10px] text-gray-700">
              Copy Right
            </span>
          </motion.div>
        </div>
      </motion.footer>
    </>
  )
}
