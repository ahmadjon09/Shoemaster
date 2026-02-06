import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { useContext, useEffect, useState } from 'react'
import { ContextData } from './contextData/Context'
import { Root } from './layout/Root'
import Err from './pages/Err'
import { Loading } from './components/Loading'
import { Ping } from './components/Ping'
import Fetch from './middlewares/fetcher'
import Cookies from 'js-cookie'
import { ProductsPage } from './pages/Product'
import { UserManagement } from './mod/UserManagement'
import { AuthModals } from './components/AuthModals'
import { Admins } from './pages/Admins'
import { Workers } from './pages/Workers'
import { Orders } from './pages/Orders'
import { AddNewOrder } from './mod/OrderModal'
import DashboardPage, { } from './pages/Dashboard'
import { runGlobalUzbekTranslit } from './assets/js/uzbekGlobalTranslit'

export default function App() {
  const { setUser, user, netErr, lang } = useContext(ContextData)
  const [isLoading, setIsLoading] = useState(false)
  const token = Cookies.get('user_token')

  // useEffect(() => {
  //   runGlobalUzbekTranslit()
  // }, [lang])

  useEffect(() => {
    const getMyData = async () => {
      setIsLoading(true)

      try {
        const { data } = await Fetch.get('/users/me')

        if (data?.data) {
          setUser(data.data)
        } else {
          logout()
        }

      } catch (error) {
        const status = error?.response?.status

        if (status === 401 || status === 403) {
          logout()
        } else {
          console.error(error)
        }

      } finally {
        setIsLoading(false)
      }
    }

    if (token) {
      getMyData()
    }

  }, [token])


  const logout = () => {
    Cookies.remove('user_token')
    setUser(null)
  }


  if (netErr) return <Ping />
  if (!token) return <AuthModals />
  if (isLoading) return <Loading />
  const isAdmin = user.role === 'admin'
  const routes = [
    { index: true, element: <ProductsPage /> },

    isAdmin && { path: 'user/:admin', element: <UserManagement /> },
    isAdmin && { path: 'user', element: <UserManagement /> },
    isAdmin && { path: 'dashboard', element: <DashboardPage /> },

    { path: 'admin', element: <Admins /> },
    { path: 'user/edit/:id', element: <UserManagement /> },
    { path: 'workers', element: <Workers /> },

    { path: 'products', element: <ProductsPage /> },

    { path: 'order', element: <Orders /> },
    { path: 'addorder/:id/:name/:phone', element: <AddNewOrder /> },

    { path: '*', element: <Err /> }
  ].filter(Boolean)

  const router = createBrowserRouter([
    {
      path: '/',
      element: <Root />,
      children: routes
    }
  ])

  return (
    <>
      <RouterProvider router={router} />
    </>
  )
}
