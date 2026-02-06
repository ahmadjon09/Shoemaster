import express from 'express'
import isExisted from '../middlewares/isExisted.js'
import {
  AllOrders,
  CancelOrder,
  NewOrder,
  UpdateOrder
} from '../controllers/order.js'

const router = express.Router()

// router.get('/', isExisted, AllOrders)
router.put('/:id', isExisted, UpdateOrder)
router.post('/new', isExisted, NewOrder)
router.delete('/:id', isExisted, CancelOrder)

export default router
