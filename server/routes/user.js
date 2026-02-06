import express from 'express'
import {
  RegisterUser,
  LoginUser,
  GetAllUsers,
  GetOneUser,
  UpdateUser,
  DeleteUser,
  getMe
} from '../controllers/user.js'
import isExisted from '../middlewares/isExisted.js'
import IsAdmin from '../middlewares/IsAdmin.js'

const router = express.Router()

router.post('/register', isExisted, RegisterUser)
// router.post('/register', RegisterUser) // First user
router.post('/login', LoginUser)
router.get('/', isExisted, GetAllUsers)
router.get('/me', isExisted, getMe)
router.get('/:id', isExisted, GetOneUser)
router.put('/:id', isExisted, UpdateUser)
router.delete('/:id', isExisted, IsAdmin, DeleteUser)

export default router
