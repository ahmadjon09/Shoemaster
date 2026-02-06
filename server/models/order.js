import mongoose from 'mongoose'

const OrderSchema = new mongoose.Schema({
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Users',
    required: true
  },

  products: [
    {
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
      },

      quantity: {
        type: Number,
        required: true,
        default: 1
      },

      price: {
        type: Number,
        required: true,
        default: 0
      }
    }
  ],
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Clients",
  },
  noClient: {
    type: Boolean,
    default: false
  },
  status: { type: String, required: true },
  total: { type: Number, default: 0 },
}, { timestamps: true })

export default mongoose.model('Order', OrderSchema)
