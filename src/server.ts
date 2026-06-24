import http from 'node:http'
import dns from 'node:dns'

// Force IPv4 first to fix ENETUNREACH errors on Render for external services like Gmail SMTP
dns.setDefaultResultOrder('ipv4first')

import dotenv from 'dotenv'
import { Server as SocketServer } from 'socket.io'

import app from './app'
import { prisma } from './config/database'
import { redis } from './config/redis'
import { authService } from './services/auth.service'
import { setSocketServer } from './config/socket'

dotenv.config()

const PORT = Number(process.env.PORT ?? 5000)

const bootstrap = async () => {
  await prisma.$connect()
  if (redis) {
    try {
      await redis.connect()
    } catch {
      // Redis is optional in local dev bootstrap.
    }
  }

  await authService.ensureSuperAdmin()

  const server = http.createServer(app)

  // ── Socket.IO ──────────────────────────────────────────────────────────────
  const io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  setSocketServer(io)

  io.on('connection', (socket) => {
    // Desktop joins a room named after the session ID to receive live updates
    socket.on('join-session', (sessionId: string) => {
      socket.join(`session:${sessionId}`)
    })
  })
  // ──────────────────────────────────────────────────────────────────────────

  server.listen(PORT, '0.0.0.0', () => {
    // eslint-disable-next-line no-console
    console.log(`HRMS backend running on http://0.0.0.0:${PORT}`)
  })
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start backend', error)
  process.exit(1)
})

