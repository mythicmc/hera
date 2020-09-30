import polka from 'polka'
import cors from 'cors'
import { json } from 'body-parser'
import { MongoClient } from 'mongodb'
import setupDatabase from './database'
import config from './config'

const port = process.env.HERA_PORT && !isNaN(+process.env.HERA_PORT) ? +process.env.HERA_PORT : 8080
const server = polka({ onError: (err) => console.error('An unhandled error occurred!', err) })
const client = new MongoClient(config.mongoUrl, { useUnifiedTopology: true })

// Support CORS.
server.use(cors({
  maxAge: 86400,
  credentials: true,
  allowedHeaders: ['Authorization', 'Username', 'Password', 'RememberMe', 'Content-Type']
}), json())

// Define missing functions from Express.
server.use((req, res, next) => {
  res.send = (body) => {
    const isObj = typeof body === 'object'
    if (isObj) res.setHeader('content-type', 'application/json')
    res.end(Buffer.isBuffer(body) || !isObj ? body : JSON.stringify(body))
    return res
  }
  res.status = (code) => { res.statusCode = code; return res }
  next()
})

server.get('/', (req, res) => res.send({ alive: true, timestamp: Date.now(), Hotel: 'Trivago' }))

server.get('*', (req, res) => res.status(404).send({ error: 'Not Found!' }))

export const connected = client.connect().then(async () => {
  const db = client.db('hera')
  await setupDatabase(db)

  server.listen(port, (err: Error) => {
    if (err) throw err
    console.log(`> Listening on port ${port}.`)
  })
}).catch(async err => {
  console.error('Failed to connect to MongoDB!', err)
  await client.close()
})

export default server
