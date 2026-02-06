import IsAdmin from "../middlewares/IsAdmin.js"
import isExisted from "../middlewares/isExisted.js"
import Client from "../models/client.js"
import Order from "../models/order.js"
import express from "express"

const router = express.Router()
router.get('/', isExisted, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const skip = (page - 1) * limit

        const filter = {}

        if (req.query.phone) {
            filter.phoneNumber = { $regex: req.query.phone, $options: 'i' }
        }

        if (req.query.name) {
            filter.fullName = { $regex: req.query.name, $options: 'i' }
        }

        const clients = await Client.find(filter)
            .select('-__v')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)

        const clientsWithStats = await Promise.all(
            clients.map(async (client) => {
                const orders = await Order.find({ client: client._id })
                    .sort({ orderDate: -1 });


                const totalOrders = orders.length
                const totalAmount = orders.reduce((sum, order) => sum + (order.total || 0), 0)
                const unpaidOrders = orders.filter(order => !order.paid).length

                return {
                    ...client.toObject(),
                    totalOrders,
                    totalAmount,
                    unpaidOrders
                }
            })
        )

        const total = await Client.countDocuments(filter)

        res.status(200).json({
            data: {
                clients: clientsWithStats,
                total,
                page,
                limit,
                hasMore: skip + limit < total
            }
        })
    } catch (error) {
        console.error('Error fetching clients:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

router.get('/:id/orders', isExisted, async (req, res) => {
    try {
        const clientId = req.params.id
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 10
        const skip = (page - 1) * limit

        const orders = await Order.find({ client: clientId })
            .populate('products.product', 'title mainImages')
            .sort({ orderDate: -1 })
            .skip(skip)
            .limit(limit)

        const allOrders = await Order.find({ client: clientId })
        const total = allOrders.length
        const totalAmount = allOrders.reduce((sum, order) => sum + (order.total || 0), 0)
        const unpaidOrders = allOrders.filter(order => !order.paid).length

        res.status(200).json({
            data: {
                orders,
                total,
                totalAmount,
                unpaidOrders,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Error fetching client orders:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

router.put('/:id', isExisted, async (req, res) => {
    try {
        const { id } = req.params
        const updateData = req.body

        const client = await Client.findByIdAndUpdate(
            id,
            updateData,
            { new: true, runValidators: true }
        ).select('-__v')

        if (!client) {
            return res.status(404).json({ error: 'Client not found' })
        }

        res.status(200).json({
            data: client,
            message: 'Client updated successfully'
        })
    } catch (error) {
        console.error('Error updating client:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

router.delete('/:id', isExisted, IsAdmin, async (req, res) => {
    try {
        const { id } = req.params

        const client = await Client.findById(id)
        if (!client) {
            return res.status(404).json({ error: 'Client not found' })
        }

        await Order.deleteMany({ client: id })

        await Client.findByIdAndDelete(id)

        res.status(200).json({
            message: 'Client and all related orders deleted successfully'
        })
    } catch (error) {
        console.error('Error deleting client:', error)
        res.status(500).json({ error: 'Server error' })
    }
})

export default router