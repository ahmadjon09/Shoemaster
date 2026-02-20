import axios from 'axios'
import Cookies from 'js-cookie'

const BASE_URL = `https://api.shoemaster.uz/v1`
// const BASE_URL = `http://localhost:5000/api`
localStorage.setItem('base_url', BASE_URL)
const token = Cookies.get('user_token')
const instance = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${token}`
  }
})




export default instance;
