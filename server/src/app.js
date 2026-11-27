import cookieParser from 'cookie-parser'
import cors from 'cors'
import express from 'express'
import { rateLimit } from 'express-rate-limit'
import helmet from 'helmet'
import { config } from './config.js'
import authRouter from './routes/auth.js'

const app = express()

if (process.env.RENDER === 'true') {
  app.set('trust proxy', 1)
}

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: config.clientOrigin, credentials: true }))
app.use(express.json({ limit: '16kb' }))
app.use(cookieParser())
app.use(
  '/api',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
)
app.use('/api/auth', authRouter)

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error)
  console.error('Unhandled request error:', error)
  return res.status(500).json({ error: 'An unexpected server error occurred.' })
})

export default app
