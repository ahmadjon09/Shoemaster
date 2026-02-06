import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import { sendErrorResponse } from './sendErrorResponse.js'

dotenv.config()

const KEY = process.env.JWTSECRET_KEY

export default function (req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/Bearer\s?/, '')
    if (!token) return sendErrorResponse(res, 401, 'Access not allowed! 📛')

    const decoded = jwt.verify(token, KEY)

    if (!decoded.id || !decoded.role) {
      return sendErrorResponse(res, 401, 'Invalid token! 📛')
    }

    req.userInfo = { userId: decoded._id, role: decoded.role }
    next()
  } catch (error) {
    return sendErrorResponse(res, 401, 'Invalid or expired token! ⛔')
  }
}
