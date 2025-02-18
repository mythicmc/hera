import polka from 'polka'
import cors from 'cors'
import { json } from 'body-parser'
import { MongoClient } from 'mongodb'
import setupDatabase from './database'
import config from './config'
// Endpoint imports.
import { loginEndpoint, logoutEndpoint, registerEndpoint, changePasswordEndpoint, refreshTokenEndpoint } from './login'
import { createForum, getForum, getForumThreads, getVisibleForums, updateForum } from './api/forums'
import { createPost, getPost, likePost, dislikePost, removePostLike } from './api/posts'
import { createThread, getThread, getThreadReplies } from './api/threads'
import { getMember, getMembers } from './api/members'

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
    const isJSON = typeof body === 'object' || Array.isArray(body)
    if (isJSON) res.setHeader('content-type', 'application/json')
    res.end(Buffer.isBuffer(body) || !isJSON ? body : JSON.stringify(body))
    return res
  }
  res.status = (code) => { res.statusCode = code; return res }
  next()
})

server.get('/', (req, res) => res.send({ alive: true, timestamp: Date.now(), Hotel: 'Trivago' }))

// Login endpoints.
server.get('/login', (req, res) => loginEndpoint(req, res, client.db('hera'))) // Deprecated!
server.post('/login', (req, res) => loginEndpoint(req, res, client.db('hera')))
server.get('/logout', (req, res) => logoutEndpoint(req, res, client.db('hera'))) // Deprecated!
server.post('/logout', (req, res) => logoutEndpoint(req, res, client.db('hera')))
server.post('/register', (req, res) => registerEndpoint(req, res, client.db('hera')))
server.get('/refreshToken', (req, res) => refreshTokenEndpoint(req, res, client.db('hera'))) // Deprecated!
server.post('/refreshToken', (req, res) => refreshTokenEndpoint(req, res, client.db('hera')))
server.post('/changePassword', (req, res) => changePasswordEndpoint(req, res, client.db('hera')))

// Exclude certain endpoints.
const publicEndpoints = ['/api/member', '/api/members', '/api/forums', '/api/forum', '/api/thread']
const excludedEndpoints = ['/api/member/@me']
// Auth filter /api/ requests and log IPs.
server.use('/api', async (req: ApiRequest, res, next) => {
  try {
    // Check for authentication.
    const skippable = req.method === 'GET' && // Exclude other methods.
    publicEndpoints.find(e => req.path.startsWith(e)) &&
    !excludedEndpoints.find(e => req.path.startsWith(e))
    if (typeof req.headers.authorization !== 'string') {
      return skippable ? next() : res.status(401).send({ error: 'No authorization token provided!' })
    }
    const accessToken = req.headers.authorization
    const token = await client.db('hera').collection('tokens').findOne({ accessToken })
    if (!token) return res.status(401).send({ error: 'Invalid access token!' })
    // Update the IP before proceeding.
    const result = await client.db('hera').collection('members').findOneAndUpdate(
      { name: token.memberId }, { $set: { ip: req.socket.remoteAddress } }, { returnOriginal: false }
    )
    req.member = result.value
    next()
  } catch (e) { next('Internal Server Error!') }
})

// Register /api/ endpoints.
server.get('/api/members', (req, res) => getMembers(req, res, client.db('hera')))
server.get('/public/members', (req, res) => getMembers(req, res, client.db('hera'))) // Deprecated!
server.get('/api/member/:name', (req, res) => getMember(req, res, client.db('hera')))
server.get('/public/member/:name', (req, res) => getMember(req, res, client.db('hera'))) // Deprecated!
server.get('/api/forums', (req, res) => getVisibleForums(req, res, client.db('hera')))
server.get('/public/forums', (req, res) => getVisibleForums(req, res, client.db('hera'))) // Deprecated!
server.get('/api/forum/:slug', (req, res) => getForum(req, res, client.db('hera')))
server.get('/public/forum/:slug', (req, res) => getForum(req, res, client.db('hera'))) // Deprecated!
server.get('/api/forum/:slug/threads', (req, res) => getForumThreads(req, res, client.db('hera')))
server.get('/public/forum/:slug/threads', (req, res) => getForumThreads(req, res, client.db('hera'))) // Deprecated!
server.post('/api/forum', (req, res) => createForum(req, res, client.db('hera')))
server.patch('/api/forum/:slug', (req, res) => updateForum(req, res, client.db('hera')))
server.get('/api/thread/:id', (req, res) => getThread(req, res, client.db('hera')))
server.get('/public/thread/:id', (req, res) => getThread(req, res, client.db('hera'))) // Deprecated!
server.get('/api/thread/:id/replies', (req, res) => getThreadReplies(req, res, client.db('hera')))
server.get('/public/thread/:id/replies', (req, res) => getThreadReplies(req, res, client.db('hera'))) // Deprecated!
server.post('/api/thread', (req, res) => createThread(req, res, client.db('hera')))
server.get('/api/post/:id', (req, res) => getPost(req, res, client.db('hera')))
server.get('/public/post/:id', (req, res) => getPost(req, res, client.db('hera'))) // Deprecated!
server.post('/api/post/:id/like', (req, res) => likePost(req, res, client.db('hera')))
server.post('/api/post/:id/dislike', (req, res) => dislikePost(req, res, client.db('hera')))
server.delete('/api/post/:id/like', (req, res) => removePostLike(req, res, client.db('hera')))
server.post('/api/post/:threadId', (req, res) => createPost(req, res, client.db('hera')))

server.all('*', (req, res) => res.status(404).send({ error: 'Endpoint not found!' }))

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
