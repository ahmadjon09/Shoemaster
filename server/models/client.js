import mongoose from 'mongoose'

const Client = new mongoose.Schema({
    phoneNumber: { type: String, default: "---", },
    fullName: { type: String, default: "---" },
})

export default mongoose.model('Clients', Client)
