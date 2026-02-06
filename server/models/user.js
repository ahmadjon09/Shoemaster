import mongoose from 'mongoose'

const UserSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true, unique: true },
  avatar: { type: String, default: "" },
  firstName: { type: String, required: true },
  lastName: { type: String },
  role: { type: String, required: true },
  owner: { type: Boolean, default: false },
  password: { type: String, required: true },
  isLoggedIn: { type: Boolean, default: false },
  telegramId: { type: String, default: "" },
}, { timestamps: true })

UserSchema.pre('save', function (next) {
  if (!this.avatar || this.avatar === "") {
    const first = this.firstName?.[0] || ""
    const initials = `${first}`.toUpperCase()

    this.avatar = `https://api.dicebear.com/7.x/initials/svg?seed=${initials}`
  }
  next()
})

export default mongoose.model('Users', UserSchema)
