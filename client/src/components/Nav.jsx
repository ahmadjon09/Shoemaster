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
  User,
  Users,
  UserPlus,
  Moon,
  Sun,
  Settings,
  Home,
  ShoppingBag,
  Users2,
  LayoutGrid,
  MoreHorizontal,
  Search,
  Bell,
  ChevronRight
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { ContextData } from '../contextData/Context'
import logo from '../assets/images/logo2.png'
import { name } from '../assets/js/i'
import { emojiRain } from '../assets/js/fun'
import SettingsModal from '../mod/Settings'

export const Nav = () => {
  const { user, removeUserToken, dark, setDark } = useContext(ContextData)
  const [isOpen, setIsOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isOpend, setIsOpend] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const dropdownRef = useRef(null)
  const navRef = useRef(null)
  const location = useLocation()

  // Scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const getWorkersMenu = (role) => {
    const baseItems = [
      { name: 'Барча ходимлар', path: '/workers', icon: <Users size={18} /> }
    ];

    if (role === "admin" || role === "owner") {
      return [
        ...baseItems,
        { name: 'Ходим қўшиш', path: '/user', icon: <UserPlus size={18} /> }
      ];
    }

    return baseItems;
  };

  // Mobil pastki navigatsiya uchun asosiy linklar
  const mobileNavLinks = [
    {
      name: 'Асосий',
      path: '/',
      icon: <Home size={24} />,
      activeIcon: <Home size={24} fill="currentColor" />
    },
    {
      name: 'Склад',
      path: '/products',
      icon: <ShoppingBag size={24} />,
      activeIcon: <ShoppingBag size={24} fill="currentColor" />
    },
    {
      name: 'Мижозлар',
      path: '/order',
      icon: <Users2 size={24} />,
      activeIcon: <Users2 size={24} fill="currentColor" />
    },
    {
      name: 'Ходимлар',
      path: '/workers',
      icon: <UserRoundPen size={24} />,
      activeIcon: <UserRoundPen size={24} fill="currentColor" />
    },
    {
      name: 'Кўпроқ',
      path: '#more',
      icon: <LayoutGrid size={24} />,
      activeIcon: <LayoutGrid size={24} fill="currentColor" />,
      isMore: true
    }
  ];

  const navLinks = [
    ...(user.role === 'admin' || user.role === 'owner' ? [
      {
        name: 'Дашборд',
        path: '/dashboard',
        icon: <LayoutGrid size={20} />,
      }
    ] : []),
    {
      name: 'Склад',
      path: "/products",
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
    ...(user.role === 'admin' || user.role === 'owner' ? [
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
  ];

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

  // Close mobile menu on route change
  useEffect(() => {
    setShowMobileMenu(false)
    setActiveDropdown(null)
  }, [location.pathname])

  const handleLogout = () => {
    if (!window.confirm('Сиз ростдан хам тизимдан чиқмоқчимисиз?')) return
    removeUserToken()
    window.location.href = '/'
  }

  const handleDropdownToggle = (dropdownName) => {
    setActiveDropdown(activeDropdown === dropdownName ? null : dropdownName)
  }

  const closeAll = () => {
    setActiveDropdown(null)
    setIsOpen(false)
    setShowMobileMenu(false)
  }

  const isLinkActive = (link) => {
    if (link.hasDropdown) {
      return link.dropdownItems.some(item => location.pathname === item.path)
    }
    return location.pathname === link.path
  }

  const isMobileLinkActive = (path) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path) && path !== '/'
  }

  const isDropdownItemActive = (itemPath) => {
    return location.pathname === itemPath
  }

  const getDefaultPath = () => {
    if (user.ability === "ready") return "/products/ready"
    if (user.ability === "!ready") return "/products/raw"
    return "/"
  }

  // Dark mode styles
  const navBg = dark
    ? scrolled ? 'bg-gray-900/95 backdrop-blur-lg border-gray-800' : 'bg-gray-900/80 backdrop-blur-md border-gray-800'
    : scrolled ? 'bg-white/95 backdrop-blur-lg border-gray-200' : 'bg-white/80 backdrop-blur-md border-gray-200'

  const textColor = dark ? 'text-white' : 'text-gray-900'
  const textMuted = dark ? 'text-gray-400' : 'text-gray-600'
  const dropdownBg = dark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  const dropdownItemHover = dark ? 'hover:bg-gray-700' : 'hover:bg-blue-50'
  const dropdownItemText = dark ? 'text-gray-200' : 'text-gray-700'
  const mobileMenuBg = dark ? 'bg-gray-900' : 'bg-white'
  const userMenuBg = dark
    ? 'bg-gray-800 hover:bg-gray-700 border-gray-700'
    : 'bg-white hover:bg-gray-50 border-gray-200 shadow-sm'
  const mobileUserBg = dark ? 'bg-gray-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50'
  const mobileSectionBg = dark ? 'bg-gray-800/50' : 'bg-gray-50'
  const borderColor = dark ? 'border-gray-800' : 'border-gray-200'
  const bottomNavBg = dark
    ? 'bg-gray-900/95 backdrop-blur-lg'
    : 'bg-white/95 backdrop-blur-lg'
  const activeNavColor = 'text-blue-500'
  const inactiveNavColor = dark ? 'text-gray-400' : 'text-gray-500'

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className={`fixed top-0 left-0 w-full h-16 z-50 transition-all duration-300 border-b ${navBg} hidden lg:block`}
      >
        <div className='container mx-auto h-full flex items-center justify-between px-4 sm:px-6 lg:px-8'>
          {/* Logo/Brand */}
          <motion.div
            className='flex items-center gap-3'
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <Link
              onDoubleClick={() => emojiRain()}
              to={getDefaultPath()}
              className='relative'
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className='relative'
              >
                <img
                  className='w-9 h-9 rounded-xl shadow-md'
                  src={logo}
                  alt='logo'
                />
                <motion.div
                  className='absolute -inset-1 rounded-xl bg-blue-500/20 -z-10'
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                />
              </motion.div>
            </Link>
            <motion.span
              className={`text-lg font-semibold ${textColor} logo`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {name}
            </motion.span>
          </motion.div>

          {/* Desktop Navigation Links */}
          <motion.div
            ref={navRef}
            className='flex items-center gap-1'
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden
                        ${isLinkActive(link)
                          ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                          : `${dark ? 'text-gray-300 hover:text-white hover:bg-gray-700/70' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/70'}`
                        }`}
                    >
                      <motion.span
                        whileHover={{ rotate: 5 }}
                        className={
                          isLinkActive(link)
                            ? 'text-white'
                            : `${dark ? 'text-gray-400 group-hover:text-white' : 'text-gray-400 group-hover:text-blue-600'}`
                        }
                      >
                        {link.icon}
                      </motion.span>
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
                          className={`absolute top-full left-0 mt-2 w-56 rounded-2xl shadow-xl border p-2 z-50 ${dropdownBg}`}
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
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group
                                  ${isDropdownItemActive(item.path)
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : `${dropdownItemHover} ${dropdownItemText} hover:text-blue-600`
                                  }`}
                                onClick={closeAll}
                              >
                                <span className={
                                  isDropdownItemActive(item.path)
                                    ? 'text-white'
                                    : `${dark ? 'text-gray-400 group-hover:text-blue-400' : 'text-gray-400 group-hover:text-blue-600'}`
                                }>
                                  {item.icon}
                                </span>
                                <span className='font-medium flex-1'>{item.name}</span>
                                {isDropdownItemActive(item.path) && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className='w-1.5 h-1.5 rounded-full bg-white'
                                  />
                                )}
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden
                      ${isLinkActive(link)
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : `${dark ? 'text-gray-300 hover:text-white hover:bg-gray-700/70' : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/70'}`
                      }`}
                  >
                    <motion.span
                      whileHover={{ rotate: 5 }}
                      className={
                        isLinkActive(link)
                          ? 'text-white'
                          : `${dark ? 'text-gray-400 group-hover:text-white' : 'text-gray-400 group-hover:text-blue-600'}`
                      }
                    >
                      {link.icon}
                    </motion.span>
                    {link.name}
                    {isLinkActive(link) && (
                      <motion.div
                        layoutId='activeNavIndicator'
                        className='absolute bottom-0 left-0 right-0 h-0.5 bg-white'
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
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
            <div className='relative' ref={dropdownRef}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleDropdownToggle('user')}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 transition-all duration-200 border ${userMenuBg}`}
              >
                <motion.div
                  className='rounded-full w-8 h-8 overflow-hidden ring-2 ring-blue-500/20'
                  whileHover={{ scale: 1.05 }}
                >
                  {user.avatar ? (
                    <img src={user?.avatar} alt={user.firstName} className='w-full h-full object-cover' />
                  ) : (
                    <div className='w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-medium'>
                      {user.firstName?.charAt(0) || 'U'}
                    </div>
                  )}
                </motion.div>
                <div className='text-left hidden xl:block'>
                  <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-800'}`}>
                    {user.firstName || 'Фойдаланувчи'}
                  </p>
                  <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'} capitalize`}>{user.role}</p>
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
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`absolute top-full right-0 mt-2 w-72 rounded-2xl shadow-xl border p-2 z-50 ${dropdownBg}`}
                  >
                    <div className={`px-4 py-3 border-b ${borderColor}`}>
                      <p className={`text-sm font-medium ${dark ? 'text-white' : 'text-gray-800'}`}>
                        {user.firstName} {user.lastName}
                      </p>
                      <p className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{user.phoneNumber}</p>
                      <div className='flex items-center gap-2 mt-3'>
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize
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
                          <span className='px-2.5 py-1 rounded-full text-xs font-medium bg-green-600 text-white'>
                            {user.ability === 'both' ? 'Ҳаммаси' :
                              user.ability === 'ready' ? 'Тайёр' : 'Хом ашё'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className='py-2'>
                      <Link
                        to={`/user/edit/${user._id}`}
                        className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl transition-all duration-200 group
                          ${dark
                            ? 'text-gray-200 hover:bg-gray-700'
                            : 'text-gray-700 hover:bg-blue-50'
                          }`}
                        onClick={closeAll}
                      >
                        <Pencil size={16} className={dark ? 'text-gray-400' : 'text-gray-500'} />
                        <span className='flex-1'>Профилни таҳрирлаш</span>
                        <ChevronRight size={16} className={dark ? 'text-gray-600' : 'text-gray-400'} />
                      </Link>

                      <button
                        onClick={() => {
                          setIsOpend(true)
                          setActiveDropdown(null)
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl transition-all duration-200 group
                          ${dark
                            ? 'text-gray-200 hover:bg-gray-700'
                            : 'text-gray-700 hover:bg-gray-100'
                          }`}
                      >
                        <Settings size={16} className={dark ? 'text-gray-400' : 'text-gray-500'} />
                        <span className='flex-1'>Созламалар</span>
                        <ChevronRight size={16} className={dark ? 'text-gray-600' : 'text-gray-400'} />
                      </button>

                      <button
                        onClick={handleLogout}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm rounded-xl transition-all duration-200
                          ${dark
                            ? 'text-red-400 hover:bg-red-900/30'
                            : 'text-red-600 hover:bg-red-50'
                          }`}
                      >
                        <LogOut size={16} />
                        <span className='flex-1'>Чиқиш</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </nav>

      {/* Mobile Layout */}
      <div className='lg:hidden'>
        {/* Mobile Header with Glass Effect */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className={`fixed top-0 left-0 right-0 h-14 z-40 transition-all duration-300 border-b ${navBg} flex items-center justify-between px-4`}
        >
          <Link
            to={getDefaultPath()}
            onDoubleClick={() => emojiRain()}
            className='relative'
          >
            <motion.div
              whileTap={{ scale: 0.9 }}
              className='relative'
            >
              <img
                className='w-8 h-8 rounded-xl shadow-md'
                src={logo}
                alt='logo'
              />
            </motion.div>
          </Link>

          <motion.h1
            className={`text-base font-semibold ${textColor} absolute left-1/2 transform -translate-x-1/2`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {name}
          </motion.h1>

          <div className='flex items-center gap-2'>
         

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className={`p-2 rounded-xl transition-all duration-300 relative
                ${dark
                  ? 'bg-gray-800 text-gray-200'
                  : 'bg-gray-100 text-gray-700'
                }`}
            >
              {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
            </motion.button>
          </div>
        </motion.header>

        {/* Mobile Menu Overlay with Blur */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`fixed inset-0 z-30 backdrop-blur-sm
                ${dark ? 'bg-black/70' : 'bg-black/40'}`}
              onClick={() => setShowMobileMenu(false)}
            />
          )}
        </AnimatePresence>

        {/* Mobile Side Menu - Modern Design */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 right-0 bottom-0 w-80 z-50 shadow-2xl ${mobileMenuBg} overflow-y-auto`}
            >
              <div className='p-5 pt-16'>
                {/* User Profile Card */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex items-center gap-4 p-5 rounded-2xl mb-6 ${mobileUserBg}`}
                >
                  <motion.div
                    className='rounded-full w-16 h-16 overflow-hidden ring-4 ring-white/20 shadow-lg'
                    whileHover={{ scale: 1.05 }}
                  >
                    {user.avatar ? (
                      <img src={user?.avatar} alt={user.firstName} className='w-full h-full object-cover' />
                    ) : (
                      <div className='w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold'>
                        {user.firstName?.charAt(0) || 'U'}
                      </div>
                    )}
                  </motion.div>
                  <div className='flex-1'>
                    <p className={`font-semibold text-lg ${dark ? 'text-white' : 'text-gray-800'}`}>
                      {user.firstName} {user.lastName}
                    </p>
                    <div className='flex items-center gap-2 mt-2'>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium
                        ${user.role === 'admin'
                          ? 'bg-purple-600 text-white'
                          : user.role === 'owner'
                            ? 'bg-red-600 text-white'
                            : 'bg-blue-600 text-white'
                        }`}>
                        {user.role}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* Navigation Sections */}
                <div className='space-y-3'>
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.path + index}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {link.hasDropdown ? (
                        <div className='space-y-2'>
                          <div className={`flex items-center gap-3 p-4 rounded-xl ${mobileSectionBg}`}>
                            <span className={dark ? 'text-blue-400' : 'text-blue-500'}>{link.icon}</span>
                            <span className={`font-medium ${dark ? 'text-gray-200' : 'text-gray-700'}`}>{link.name}</span>
                          </div>
                          <div className='ml-4 space-y-1.5'>
                            {link.dropdownItems.map((item, itemIndex) => (
                              <Link
                                key={item.path + itemIndex}
                                to={item.path}
                                onClick={closeAll}
                                className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200
                                  ${isDropdownItemActive(item.path)
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                    : `${dark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-blue-50'}`
                                  }`}
                              >
                                <span className={
                                  isDropdownItemActive(item.path)
                                    ? 'text-white'
                                    : `${dark ? 'text-gray-400' : 'text-gray-400'}`
                                }>
                                  {item.icon}
                                </span>
                                <span className='font-medium flex-1'>{item.name}</span>
                                {isDropdownItemActive(item.path) && (
                                  <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className='w-1.5 h-1.5 rounded-full bg-white'
                                  />
                                )}
                              </Link>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <Link
                          to={link.path}
                          onClick={closeAll}
                          className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-200
                            ${isLinkActive(link)
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                              : `${dark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-blue-50'}`
                            }`}
                        >
                          <span className={
                            isLinkActive(link)
                              ? 'text-white'
                              : `${dark ? 'text-gray-400' : 'text-gray-400'}`
                          }>
                            {link.icon}
                          </span>
                          <span className='font-medium flex-1'>{link.name}</span>
                          {isLinkActive(link) && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className='w-1.5 h-1.5 rounded-full bg-white'
                            />
                          )}
                        </Link>
                      )}
                    </motion.div>
                  ))}
                </div>

                {/* Settings and Logout */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className={`mt-8 pt-6 border-t ${borderColor}`}
                >
                  <Link
                    to={`/user/edit/${user._id}`}
                    className={`flex items-center gap-4 p-4 rounded-xl mb-2 transition-all duration-200
                      ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                    onClick={closeAll}
                  >
                    <div className={`p-2 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <Pencil size={18} className={dark ? 'text-gray-300' : 'text-gray-600'} />
                    </div>
                    <span className={`font-medium flex-1 ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
                      Профилни таҳрирлаш
                    </span>
                  </Link>

                  <button
                    onClick={() => {
                      setIsOpend(true)
                      setShowMobileMenu(false)
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl mb-2 transition-all duration-200
                      ${dark ? 'hover:bg-gray-800' : 'hover:bg-gray-100'}`}
                  >
                    <div className={`p-2 rounded-lg ${dark ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <Settings size={18} className={dark ? 'text-gray-300' : 'text-gray-600'} />
                    </div>
                    <span className={`font-medium flex-1 ${dark ? 'text-gray-200' : 'text-gray-700'}`}>
                      Созламалар
                    </span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200
                      ${dark
                        ? 'text-red-400 hover:bg-red-900/30'
                        : 'text-red-600 hover:bg-red-50'
                      }`}
                  >
                    <div className={`p-2 rounded-lg ${dark ? 'bg-red-900/30' : 'bg-red-100'}`}>
                      <LogOut size={18} />
                    </div>
                    <span className='font-medium flex-1'>Чиқиш</span>
                  </button>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Premium Bottom Navigation */}
        <motion.nav
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2, type: 'spring', damping: 25 }}
          className={`fixed bottom-0 left-0 right-0 h-16 z-40 backdrop-blur-xl border-t ${bottomNavBg} ${borderColor} flex items-center justify-around px-2 safe-bottom`}
        >
          {mobileNavLinks.map((link, index) => {
            const isActive = link.isMore ? false : isMobileLinkActive(link.path);

            if (link.isMore) {
              return (
                <motion.button
                  key="more"
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowMobileMenu(true)}
                  className='flex flex-col items-center justify-center flex-1 h-full group'
                >
                  <motion.div
                    animate={{
                      scale: showMobileMenu ? 1.1 : 1,
                      y: showMobileMenu ? -2 : 0
                    }}
                    className={`relative transition-colors duration-200
                      ${showMobileMenu ? activeNavColor : inactiveNavColor}
                      group-hover:${activeNavColor}`}
                  >
                    <LayoutGrid size={24} />
                    {showMobileMenu && (
                      <motion.div
                        layoutId='mobileActiveTab'
                        className='absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500'
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </motion.div>
                  <span className={`text-xs mt-1 transition-colors duration-200
                    ${showMobileMenu ? activeNavColor : inactiveNavColor}`}>
                    Кўпроқ
                  </span>
                </motion.button>
              );
            }

            return (
              <Link
                key={link.path}
                to={link.path}
                className='flex flex-col items-center justify-center flex-1 h-full group'
              >
                <motion.div
                  whileTap={{ scale: 0.9 }}
                  className='relative'
                >
                  {isActive ? (
                    <span className={activeNavColor}>{link.activeIcon}</span>
                  ) : (
                    <span className={`${inactiveNavColor} group-hover:${activeNavColor} transition-colors duration-200`}>
                      {link.icon}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId='mobileActiveTab'
                      className='absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500'
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
                <span className={`text-xs mt-1 transition-colors duration-200
                  ${isActive ? activeNavColor : inactiveNavColor}
                  group-hover:${activeNavColor}`}>
                  {link.name}
                </span>
              </Link>
            );
          })}
        </motion.nav>

        =
      </div>

      <SettingsModal open={isOpend} onClose={() => setIsOpend(false)} />
    </>
  )
}