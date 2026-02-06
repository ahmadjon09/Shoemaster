import axios from 'axios'
import Cookies from 'js-cookie'

const BASE_URL = `https://shoemaster-dfyw.onrender.com/api`

const token = Cookies.get('user_token')
const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${token}`
  }
})




export default instance;
