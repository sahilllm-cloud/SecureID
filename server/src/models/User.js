import mongoose from 'mongoose'

const passkeySchema = new mongoose.Schema(
  {
    credentialId: { type: String, required: true },
    publicKey: { type: String, required: true },
    counter: { type: Number, required: true, default: 0 },
    transports: { type: [String], default: [] },
    deviceType: { type: String },
    backedUp: { type: Boolean, default: false },
  },
  { _id: false },
)

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    surname: { type: String, required: true, trim: true, maxlength: 80 },
    dateOfBirth: { type: Date, required: true },
    passkeys: { type: [passkeySchema], default: [] },
    activeSessionHash: { type: String, unique: true, sparse: true, select: false },
    activeSessionExpiresAt: { type: Date, select: false },
  },
  { timestamps: true },
)

export const User = mongoose.model('User', userSchema)
