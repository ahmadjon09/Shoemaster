import { useState, useRef, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut,
  Menu,
  Pencil,
  X,
  ChevronDown,
  ShieldUser,
  UserRoundPen,
  Boxes,
  BarChart3,
  ReceiptText,
  User,
  Users,
  UserPlus,
  Circle,
  PieChart,
  Moon,
  Sun,
  QrCode,
  Calculator,
  Users2,
  ChartSpline,
  Settings
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ContextData } from '../contextData/Context'
import logo from '../assets/images/logo2.png'
import { name } from '../assets/js/i'
import { emojiRain } from '../assets/js/fun'
import { LanguageSwitcher } from './LanguageSwitcher'
import SettingsModal from '../mod/Settings'

export const Nav = () => {
  const { user, removeUserToken, dark, setDark } = useContext(ContextData)
  const [isOpen, setIsOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)


  const dropdownRef = useRef(null)
  const navRef = useRef(null)
  const location = useLocation()



  const getWorkersMenu = (role) => {
    const baseItems = [
      { name: 'Барча ходимлар', path: '/workers', icon: <Users size={18} /> }
    ];

    if (role === "admin") {
      return [
        ...baseItems,
        { name: 'Ходим қўшиш', path: '/user', icon: <UserPlus size={18} /> }
      ];
    }

    return baseItems;
  };

  const navLinks = [
    ...(user.role === 'admin' ? [
      {
        name: 'Дашборд',
        path: '/dashboard',
        icon: <ChartSpline size={20} />,

      }
    ] : []),
    {
      name: 'Склад',
      path: "/",
      icon: <Boxes size={20} />,
    },
    {
      name: 'Мижозлар',
      path: '/order',
      icon: <Users2 size={20} />,
      hasDropdown: false
    },
    {
      name: 'Ходимлар',
      path: '/workers',
      icon: <UserRoundPen size={20} />,
      hasDropdown: true,
      dropdownItems: getWorkersMenu(user.role)
    },
    ...(user.role === 'admin' ? [
      {
        name: 'Админлар',
        path: '/admin',
        icon: <ShieldUser size={20} />,
        hasDropdown: true,
        dropdownItems: [
          { name: 'Барча aдминлар', path: '/admin', icon: <Users size={18} /> },
          { name: 'Админ қўшиш', path: '/user/add-admin', icon: <UserPlus size={18} /> }
        ]
      }
    ] : [])
  ]

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null)
      }
      if (navRef.current && !navRef.current.contains(event.target) && activeDropdown) {
        setActiveDropdown(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [activeDropdown])

  const handleLogout = () => {
    if (!window.confirm('Сиз ростдан хам тизимдан чиқмоқчимисиз?')) return
    removeUserToken()
    window.location.href = '/'
  }

  const handleDropdownToggle = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName)
  }

  const closeAllDropdowns = () => {
    setActiveDropdown(null)
    setIsOpen(false)
  }

  const isLinkActive = (link) => {
    if (link.hasDropdown) {
      return link.dropdownItems.some(item => location.pathname === item.path)
    }
    return location.pathname === link.path
  }

  const isDropdownItemActive = (itemPath) => {
    return location.pathname === itemPath
  }

  const getDefaultPath = () => {
    if (user.ability === "ready") return "/products/ready"
    if (user.ability === "!ready") return "/products/raw"
    return "/"
  }

  const [isOpend, setIsOpend] = useState(false)

  // Dark mode styles
  const navBg = dark ? 'bg-gray-900/80 border-gray-700' : 'bg-white/80 border-gray-100'
  const textColor = dark ? 'text-white' : 'text-gray-900'
  const textMuted = dark ? 'text-gray-300' : 'text-gray-600'
  const dropdownBg = dark ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-100'
  const dropdownItemHover = dark ? 'hover:bg-gray-700' : 'hover:bg-blue-50'
  const dropdownItemText = dark ? 'text-gray-200' : 'text-gray-700'
  const mobileMenuBg = dark ? 'bg-gray-900/95' : 'bg-white/95'
  const userMenuBg = dark ? 'bg-gray-800 hover:bg-gray-700 border-gray-600' : 'bg-white hover:bg-gray-50 border-gray-100'
  const mobileUserBg = dark ? 'bg-gray-800' : 'bg-blue-50'
  const mobileSectionBg = dark ? 'bg-gray-800' : 'bg-gray-50'
  const borderColor = dark ? 'border-gray-700' : 'border-gray-100'

  return (
    <nav className={`fixed top-0 left-0 w-full h-16 z-50 backdrop-blur-md shadow-sm border-b ${navBg} ${borderColor}`}>
      <div className='container mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8'>
        {/* Logo/Brand */}
        <motion.div
          className='flex items-center gap-2'
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          <Link
            onDoubleClick={() => emojiRain()}

            to={getDefaultPath()}>
            <motion.img
              className='w-9 h-9 rounded-lg shadow-sm'
              src={logo}
              alt='logo'
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            />
          </Link>
          <span className={`text-lg font-semibold ${textColor} logo `}>{name}</span>
        </motion.div>

        {/* Desktop Navigation */}
        <motion.div
          ref={navRef}
          className='hidden lg:flex items-center gap-1'
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          {navLinks.map((link, index) => (
            <motion.div
              key={link.path + index}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className='relative'
            >
              {link.hasDropdown ? (
                <>
                  <button
                    onClick={() => handleDropdownToggle(link.name)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group
                      ${isLinkActive(link)
                        ? 'bg-blue-600 text-white shadow-md'
                        : `${dark ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`
                      }`}
                  >
                    <span className={
                      isLinkActive(link)
                        ? 'text-white'
                        : `${dark ? 'text-gray-400 group-hover:text-white' : 'text-gray-400 group-hover:text-blue-600'}`
                    }>
                      {link.icon}
                    </span>
                    {link.name}
                    <motion.div
                      animate={{ rotate: activeDropdown === link.name ? 180 : 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ChevronDown size={16} className={
                        isLinkActive(link)
                          ? 'text-white'
                          : `${dark ? 'text-gray-400' : 'text-gray-400'}`
                      } />
                    </motion.div>
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {activeDropdown === link.name && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`absolute top-full left-0 mt-1 w-56 rounded-xl shadow-lg border p-2 z-50 ${dropdownBg}`}
                      >
                        {link.dropdownItems.map((item, itemIndex) => (
                          <motion.div
                            key={item.path + itemIndex}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: itemIndex * 0.05 }}
                          >
                            <Link
                              to={item.path}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group
                                ${isDropdownItemActive(item.path)
                                  ? 'bg-blue-600 text-white shadow-sm'
                                  : `${dropdownItemHover} ${dropdownItemText} hover:text-blue-600`
                                }`}
                              onClick={closeAllDropdowns}
                            >
                              <span className={
                                isDropdownItemActive(item.path)
                                  ? 'text-white'
                                  : `${dark ? 'text-gray-400 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-600'}`
                              }>
                                {item.icon}
                              </span>
                              <span className='font-medium'>{item.name}</span>
                            </Link>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link
                  to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                    ${isLinkActive(link)
                      ? 'bg-blue-600 text-white shadow-md'
                      : `${dark ? 'text-gray-300 hover:text-white hover:bg-gray-700' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'}`
                    }`}
                >
                  <span
                    className={
                      isLinkActive(link)
                        ? 'text-white'
                        : `${dark ? 'text-gray-400 group-hover:text-white' : 'text-gray-400 group-hover:text-blue-600'}`
                    }
                  >
                    {link.icon}
                  </span>
                  {link.name}
                </Link>
              )}
            </motion.div>
          ))}
        </motion.div>
        {/* User Menu & Dark Mode Toggle */}
        <motion.div
          className='flex items-center gap-3'
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >

          {/* Desktop User Dropdown */}
          <div className='hidden lg:block relative' ref={dropdownRef}>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveDropdown(activeDropdown === 'user' ? null : 'user')}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 transition-all duration-200 border shadow-sm ${userMenuBg}`}
            >
              <div className='rounded-md w-[30px] h-[30px]'>
                {user.avatar ? <img src={user?.avatar} alt={user.firstName} className='w-full h-full object-cover rounded-2xl' /> : <User />}
              </div>
              <div className='text-left'>
                <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-800'}`}>
                  {user.firstName || 'Фойдаланувчи'}
                </p>
                <p className={`text-xs ${dark ? 'text-gray-300' : 'text-gray-500'} capitalize`}>{user.role}</p>
              </div>
              <motion.div
                animate={{ rotate: activeDropdown === 'user' ? 180 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <ChevronDown size={16} className={dark ? 'text-gray-400' : 'text-gray-400'} />
              </motion.div>
            </motion.button>

            <AnimatePresence>
              {activeDropdown === 'user' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className={`absolute top-full right-0 mt-2 w-64 rounded-xl shadow-lg border p-2 z-50 ${dropdownBg}`}
                >
                  <div className={`px-3 py-2 border-b ${dark ? 'border-gray-700' : 'border-gray-100'}`}>
                    <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-800'}`}>
                      {user.firstName} {user.lastName}
                    </p>
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{user.phoneNumber}</p>
                    <div className='flex items-center gap-2 mt-2'>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize
                          ${user.role === 'admin'
                            ? 'bg-purple-600 text-white'
                            : user.role === 'owner'
                              ? 'bg-red-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                      >
                        {user.role}
                      </span>
                      {user.ability && user.role === 'worker' && (
                        <span className='px-2 py-1 rounded-full text-xs font-medium bg-green-600 text-white'>
                          {user.ability === 'both' ? 'Ҳаммаси' :
                            user.ability === 'ready' ? 'Тайёр' : 'Хом ашё'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className='py-1'>
                    <Link
                      to={`/user/edit/${user._id}`}
                      className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${dark
                        ? 'text-gray-200 hover:bg-gray-700'
                        : 'text-gray-700 hover:bg-blue-50'
                        }`}
                      onClick={closeAllDropdowns}
                    >
                      <Pencil size={16} className={dark ? 'text-gray-400' : 'text-gray-500'} />
                      Профилни таҳрирлаш
                    </Link>
                    <button
                      onClick={() => setIsOpend(true)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-gray-500`}
                    >
                      <Settings size={16} />
                      Созламалар
                    </button>
                    <button
                      onClick={handleLogout}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors ${dark
                        ? 'text-red-400 hover:bg-red-900'
                        : 'text-red-600 hover:bg-red-50'
                        }`}
                    >
                      <LogOut size={16} />
                      Чиқиш
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`lg:hidden p-2 rounded-lg ${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
              }`}
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Ёпиш' : 'Меню'}
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </motion.button>
        </motion.div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className={`lg:hidden fixed inset-x-0 top-16 z-40 backdrop-blur-md shadow-lg ${mobileMenuBg}`}
          >
            <div className='p-4 space-y-3'>
              <motion.div
                className={`flex items-center gap-3 p-3 rounded-lg ${mobileUserBg}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className='bg-blue-600 p-2 rounded-md'>
                  <User className='h-5 w-5 text-white' />
                </div>
                <div>
                  <p className={`font-medium ${dark ? 'text-white' : 'text-gray-800'}`}>
                    {user.firstName} {user.lastName}
                  </p>
                  <p className={`text-sm ${dark ? 'text-gray-300' : 'text-gray-600'} capitalize`}>
                    {user.role}
                  </p>
                  {user.ability && user.role === 'worker' && (
                    <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Кўриш ҳуқуқи: {user.ability === 'both' ? 'Ҳаммаси' :
                        user.ability === 'ready' ? 'Тайёр' : 'Хом ашё'}
                    </p>
                  )}
                </div>
              </motion.div>

              <div className='space-y-1 max-h-[50vh] overflow-hidden overflow-y-scroll'>
                {navLinks.map((link, index) => (
                  <motion.div
                    key={link.path + index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    {link.hasDropdown ? (
                      <div className='space-y-1'>
                        <div className={`flex items-center gap-3 p-3 rounded-lg ${mobileSectionBg}`}>
                          <span className={dark ? 'text-gray-400' : 'text-gray-400'}>{link.icon}</span>
                          <span className={`font-medium ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{link.name}</span>
                        </div>
                        <div className='ml-4 space-y-1'>
                          {link.dropdownItems.map((item, itemIndex) => (
                            <Link
                              key={item.path + itemIndex}
                              to={item.path}
                              onClick={closeAllDropdowns}
                              className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-200
                                ${isDropdownItemActive(item.path)
                                  ? 'bg-blue-600 text-white'
                                  : `${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-blue-50'}`
                                }`}
                            >
                              <span
                                className={
                                  isDropdownItemActive(item.path)
                                    ? 'text-white'
                                    : `${dark ? 'text-gray-400' : 'text-gray-400'}`
                                }
                              >
                                {item.icon}
                              </span>
                              <span className='font-medium'>{item.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Link
                        to={link.path}
                        onClick={closeAllDropdowns}
                        className={`flex items-center gap-3 p-3 rounded-lg transition-all duration-200
                          ${isLinkActive(link)
                            ? 'bg-blue-600 text-white'
                            : `${dark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-blue-50'}`
                          }`}
                      >
                        <span
                          className={
                            isLinkActive(link)
                              ? 'text-white'
                              : `${dark ? 'text-gray-400' : 'text-gray-400'}`
                          }
                        >
                          {link.icon}
                        </span>
                        <span className='font-medium'>{link.name}</span>
                      </Link>
                    )}
                  </motion.div>
                ))}
              </div>

              <motion.div
                className={`border-t pt-3 space-y-1 ${borderColor}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Link
                  to={`/user/edit/${user._id}`}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${dark
                    ? 'text-gray-300 hover:bg-gray-700'
                    : 'text-gray-600 hover:bg-blue-50'
                    }`}
                  onClick={closeAllDropdowns}
                >
                  <Pencil size={20} className={dark ? 'text-gray-400' : 'text-gray-500'} />
                  <span>Профилни таҳрирлаш</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${dark
                    ? 'text-red-400 hover:bg-red-900'
                    : 'text-red-600 hover:bg-red-50'
                    }`}
                >
                  <LogOut size={20} />
                  <span>Чиқиш</span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <SettingsModal open={isOpend} onClose={() => setIsOpend(false)} />
    </nav>
  )
}