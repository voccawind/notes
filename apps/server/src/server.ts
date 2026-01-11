import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from 'dotenv'

// Load environment variables
config()

const PORT = parseInt(process.env.PORT || '4000', 10)
const HOST = process.env.HOST || '0.0.0.0'

// Initialize Fastify
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
  },
})

// Register plugins
await fastify.register(cors, {
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
})

// Health check
fastify.get('/health', async () => {
  return {
    status: 'ok',
    version: '0.1.0',
    timestamp: Date.now(),
  }
})

// Auth routes (placeholder)
fastify.post('/auth/register', async (_request, reply) => {
  reply.code(501).send({ error: 'Not implemented yet' })
})

fastify.post('/auth/login', async (_request, reply) => {
  reply.code(501).send({ error: 'Not implemented yet' })
})

// Sync routes (placeholder)
fastify.get('/sync/:orbitId/list', async (_request, reply) => {
  reply.code(501).send({ error: 'Not implemented yet' })
})

fastify.get('/sync/:orbitId/blob/:blobId', async (_request, reply) => {
  reply.code(501).send({ error: 'Not implemented yet' })
})

fastify.post('/sync/:orbitId/blob', async (_request, reply) => {
  reply.code(501).send({ error: 'Not implemented yet' })
})

fastify.delete('/sync/:orbitId/blob/:blobId', async (_request, reply) => {
  reply.code(501).send({ error: 'Not implemented yet' })
})

// Start server
try {
  await fastify.listen({ port: PORT, host: HOST })
  console.log(`Server listening on http://${HOST}:${PORT}`)
} catch (err) {
  fastify.log.error(err)
  process.exit(1)
}

// Graceful shutdown
const signals = ['SIGINT', 'SIGTERM']
signals.forEach(signal => {
  process.on(signal, async () => {
    console.log(`Received ${signal}, shutting down gracefully...`)
    await fastify.close()
    process.exit(0)
  })
})
