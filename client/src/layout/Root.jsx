import { Outlet } from 'react-router-dom'
import { Nav } from '../components/Nav'
import { Ping } from '../components/Ping'
import { AboutModal } from '../mod/Info'
import { Footer } from '../components/Footer'
import { FloatingAIBot } from '../mod/AI'
import { USDToUZSWidget } from '../mod/Kurs'

export const Root = () => {
  return (
    <>
      <Nav />
      <br />
      <br />
      <main className='pt-2.5 text-gray-700 container'>
        <Outlet />
        <Ping />
        <AboutModal />
        <FloatingAIBot />
        <USDToUZSWidget />
      </main>
      <Footer />
    </>
  )
}
