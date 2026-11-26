import mongoose from 'mongoose'

const authChallengeSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['signup-otp', 'login-otp', 'register-passkey', 'authenticate-passkey'],
      required: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    otpHash: { type: String, select: false },
    webauthnChallenge: { type: String },
    signupData: {
      email: String,
      phone: String,
      surname: String,
      dateOfBirth: Date,
    },
    attempts: { type: Number, default: 0 },
    resendAt: { type: Date },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    consumedAt: { type: Date },
  },
  { timestamps: true },
)

export const AuthChallenge = mongoose.model('AuthChallenge', authChallengeSchema)
