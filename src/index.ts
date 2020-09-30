import polka from 'polka'
import cors from 'cors'
import { json } from 'body-parser'

const server = polka({
  onError: (err) => console.error('An unhandled error occurred!', err)
})
const port = process.env.HERA_PORT && !isNaN(+process.env.HERA_PORT) ? +process.env.HERA_PORT : 8080

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

server.get('/', (req, res) => res.send({ alive: true, Hotel: 'Trivago' }))

server.get('*', (req, res) => res.status(404).send({ error: 'Not Found!' }))

server.listen(port, (err: Error) => {
  if (err) throw err
  console.log(`> Listening on port ${port}.`)
})

export default server
