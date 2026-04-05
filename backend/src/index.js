import express from 'express'
import cors from 'cors'
import { colorhuntSync } from './routes/colorhuntSync.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: [
    'https://pb-swatch-studio.netlify.app',
    'http://localhost:5173',
    'https://colorhunt.co',
  ],
  methods: ['GET', 'POST'],
}))

app.use(express.json({ limit: '5mb' }))

// Routes
app.use('/api/colorhunt', colorhuntSync)

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'swatch-studio-backend',
    syncKey: process.env.COLORHUNT_SYNC_API_KEY ? 'set' : 'missing',
    palettes: store.palettes.length,
  })
})

// In-memory store (replaces database for now — migrates to Supabase in Phase B)
export const store = {
  palettes: [],
  colors: [],
}

app.listen(PORT, () => {
  console.log(`Swatch Studio backend running on port ${PORT}`)
})
