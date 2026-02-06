import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/user.js'
import { sendErrorResponse } from '../middlewares/sendErrorResponse.js'

const KEY = process.env.JWTSECRET_KEY

export const RegisterUser = async (req, res) => {
  try {
    const { phoneNumber, firstName, lastName, role, password, avatar } = req.body

    const existingUser = await User.findOne({ phoneNumber })
    if (existingUser) {
      return sendErrorResponse(res, 400, 'Бундай фойдаланувчи аллақачон мавжуд.')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = new User({
      phoneNumber,
      firstName,
      lastName,
      role,
      avatar,
      password: hashedPassword
    })

    await newUser.save()

    return res.status(201).json({
      message: 'Фойдаланувчи муваффақиятли рўйхатдан ўтди',
      user: {
        id: newUser._id,
        phoneNumber: newUser.phoneNumber,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      }
    })
  } catch (error) {
    return sendErrorResponse(
      res,
      500,
      'Сервер хатолиги. Илтимос, кейинроқ уриниб кўринг!',
      error
    )
  }
}

export const LoginUser = async (req, res) => {
  try {
    const { phoneNumber, password } = req.body

    const user = await User.findOne({ phoneNumber })
    if (!user) {
      return sendErrorResponse(res, 404, 'Фойдаланувчи топилмади.')
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return sendErrorResponse(res, 400, 'Нотўғри логин ёки пароль.')
    }

    const token = jwt.sign({ id: user._id, role: user.role }, KEY, {
      expiresIn: '7d'
    })

    return res.status(200).json({
      message: 'Кириш муваффақиятли амалга оширилди',
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    })
  } catch (error) {
    return sendErrorResponse(
      res,
      500,
      'Сервер хатолиги. Илтимос, кейинроқ уриниб кўринг!',
      error
    )
  }
}

export const GetAllUsers = async (_, res) => {
  try {
    const users = await User.find().select('-password')
    if (users.length === 0) {
      return res.status(404).json({ message: 'Ҳозирча ҳеч қандай фойдаланувчи йўқ.' })
    }
    return res.status(200).json({ data: users })
  } catch (error) {
    return sendErrorResponse(
      res,
      500,
      'Сервер хатолиги. Илтимос, кейинроқ уриниб кўринг!',
      error
    )
  }
}

export const GetOneUser = async (req, res) => {
  const { id } = req.params
  try {
    const user = await User.findById(id).select('-password')
    if (!user) {
      return sendErrorResponse(res, 404, 'Фойдаланувчи топилмади.')
    }
    return res.status(200).json({ data: user })
  } catch (error) {
    return sendErrorResponse(
      res,
      500,
      'Сервер хатолиги. Илтимос, кейинроқ уриниб кўринг!',
      error
    )
  }
}

export const getMe = async (req, res) => {
  try {
    const token = (req.headers.authorization || '').replace(/Bearer\s?/, '')
    if (!token) return sendErrorResponse(res, 401, 'Кириш рухсат этилмаган!')

    const decoded = jwt.verify(token, KEY)
    let user = await User.findById(decoded.id)
    if (!user) {
      return res.status(404).json({ message: 'Фойдаланувчи топилмади!' })
    }

    return res.status(200).json({ data: user })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

export const UpdateUser = async (req, res) => {
  const { id } = req.params
  try {
    let updateData = { ...req.body }

    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10)
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true
    }).select('-password')

    if (!updatedUser) {
      return sendErrorResponse(res, 404, 'Фойдаланувчи топилмади.')
    }

    return res.status(200).json({
      message: 'Фойдаланувчи маълумотлари муваффақиятли янланди',
      data: updatedUser
    })
  } catch (error) {
    return sendErrorResponse(
      res,
      500,
      'Сервер хатолиги. Илтимос, кейинроқ уриниб кўринг!',
      error
    )
  }
}

export const DeleteUser = async (req, res) => {
  const { id } = req.params
  try {
    const deletedUser = await User.findByIdAndDelete(id)
    if (!deletedUser) {
      return sendErrorResponse(res, 404, 'Фойдаланувчи топилмади.')
    }
    return res
      .status(200)
      .json({ message: 'Фойдаланувчи муваффақиятли ўчирилди.' })
  } catch (error) {
    return sendErrorResponse(
      res,
      500,
      'Сервер хатолиги. Илтимос, кейинроқ уриниб кўринг!',
      error
    )
  }
}