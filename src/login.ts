import bcrypt from 'bcrypt'
import crypto from 'crypto'

export const getRandomBytes = (bytes: number) => crypto.randomBytes(bytes)
export const hashPassword = async (password: string) => {
  const salt = await bcrypt.genSalt(10, 'a') // Matches Spring configuration.
  return await bcrypt.hash(password, salt)
}

// POST /login
export const loginEndpoint: Endpoint = async (req, res, db) => {
  try {
    if (typeof req.headers.username !== 'string' || typeof req.headers.password !== 'string') {
      return res.status(400).send({ error: 'No username and/or password provided!' })
    }

    // Begin lookup.
    const members = await db.collection('members').aggregate([
      { $match: { $and: [{ name: req.headers.username }] } },
      { $lookup: { from: 'hashes', localField: 'name', foreignField: 'memberId', as: 'pass' } },
      { $unwind: '$pass' }
    ]).toArray()
    if (members.length !== 1 || !await bcrypt.compare(req.headers.password, members[0].pass.hash)) {
      return res.status(401).send({ error: 'Invalid username or password!' })
    } else if (!members[0].validated) return res.status(403).send({ error: 'This account is unverified!' })

    // Generate login data.
    const loginData: { refreshToken?: string, accessToken: string } = {
      accessToken: getRandomBytes(25).toString('base64')
    }
    if (req.headers.rememberMe === 'true') {
      loginData.refreshToken = getRandomBytes(25).toString('base64')
    }

    // Perform insert.
    await db.collection('tokens').insertOne({
      memberId: members[0].name, createdOn: new Date(), ...loginData
    })

    // Update last login time.
    await db.collection('members').updateOne(
      { name: { $eq: members[0].name } },
      { $set: { lastLogin: new Date() } }
    )
    // Send back tokens.
    return res.status(200).send(loginData)
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

// POST /logout
export const logoutEndpoint: Endpoint = async (req, res, db) => {
  try {
    if (typeof req.headers.authorization !== 'string') {
      return res.status(401).send({ error: 'No authorization token provided!' })
    }
    const result = await db.collection('tokens').deleteOne({ accessToken: { $eq: req.headers.authorization } })
    if (result.deletedCount !== 1) return res.status(401).send({ error: 'Invalid access token!' })
    return res.status(200).send({ success: true })
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

// POST /register
export const registerEndpoint: Endpoint = async (req, res, db) => {
  try {
  // TODO: Form validation.
  // Required fields: username, email, password
    if (
      typeof req.body.username !== 'string' || typeof req.body.email !== 'string' ||
      typeof req.body.password !== 'string'
    ) return res.status(400).send({ error: 'Invalid request body!' })
    const date = new Date()
    const member: Member = {
      name: req.body.username,
      email: req.body.email,
      createdOn: date,
      lastLogin: date,
      validated: false,
      roleIds: [],
      ip: ''
    }

    // Set the IP.
    const forwards = req.headers['x-forwarded-for'] ?? req.socket.remoteAddress
    member.ip = Array.isArray(forwards) ? forwards[0] : forwards ?? ''

    // Validate username and e-mails.
    if (!/^[a-zA-Z0-9_]*$/.test(member.name)) return res.status(400).send({ error: 'Invalid username!' })
    const existingMember = await db.collection('members').findOne({
      $or: [{ name: { $eq: member.name } }, { email: { $eq: member.email } }]
    })
    if (existingMember) {
      return res.status(409).send({
        error: existingMember.name === member.name
          ? 'This username is already taken!' : 'An account with this email already exists!'
      })
    }

    // Create new member.
    await db.collection('members').insertOne(member)
    await db.collection('hashes').insertOne({ memberId: member.name, hash: await hashPassword(req.body.password) })
    // TODO: Send verification email.
    return res.status(200).send({ success: true })
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

// POST /changePassword
export const changePasswordEndpoint: Endpoint = async (req, res, db) => {
  try {
    if (typeof req.headers.authorization !== 'string') {
      return res.status(401).send({ error: 'No authorization token provided!' })
    } else if (typeof req.body.password !== 'string' || typeof req.body.newPassword !== 'string') {
      return res.status(400).send({ error: 'Invalid request body!' })
    }
    const token = await db.collection('tokens').findOne({ accessToken: req.headers.authorization })
    if (!token) return res.status(401).send({ error: 'Invalid access token!' })
    const hash = await db.collection('hashes').findOne({ memberId: token.memberId })
    if (!await bcrypt.compare(req.body.password, hash.hash)) {
      return res.status(403).send({ error: 'Invalid password!' })
    }
    const newPassword = await hashPassword(req.body.newPassword)
    await db.collection('hashes').updateOne(
      { memberId: { $eq: token.memberId } }, { $set: { hash: newPassword } }
    )
    await db.collection('tokens').deleteMany({ memberId: { $eq: token.memberId } })
    return res.status(200).send({ success: true })
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

// POST /refreshToken
export const refreshTokenEndpoint: Endpoint = async (req, res, db) => {
  try {
    if (typeof req.headers.authorization !== 'string') {
      return res.status(401).send({ error: 'No authorization token provided!' })
    }
    const accessToken = getRandomBytes(25).toString('base64')
    const result = await db.collection('tokens').updateOne(
      { refreshToken: req.headers.authorization }, { $set: { accessToken } }
    )
    if (result.modifiedCount === 0) return res.status(401).send({ error: 'Invalid access token!' })
    return res.status(200).send({ refreshToken: req.headers.authorization, accessToken })
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}
