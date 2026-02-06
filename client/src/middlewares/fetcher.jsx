import axios from 'axios'
import Cookies from 'js-cookie'

<<<<<<< HEAD
const BASE_URL = `https://shoemaster-cgo0.onrender.com/api`
// const BASE_URL = `http://localhost:3828/api`
=======
const origin = window.location.origin;
const BASE_URL = `https://shoemaster-cgo0.onrender.com/api`
// const BASE_URL = `${origin}/api`
>>>>>>> 7ba2d0a (remove domen)


const token = Cookies.get('user_token')
const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${token}`
  }
})




export default instance;
