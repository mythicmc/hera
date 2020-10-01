/*
* - GET /api/members - Get list of members.
* - GET /api/member/:name - Get member by name.
* - GET /api/member/@me - Get self member.
*/
export const getMembers: Endpoint = async (req, res, db) => { // TODO: Paginate.
  try {
    const members = await db.collection('members').find({}).toArray()
    return res.status(200).send(members.map(member => {
      delete member._id
      return member
    }))
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

export const getMember: Endpoint = async (req, res, db) => {
  try {
    if (!req.params.name) return res.status(404).send({ error: 'No username specified!' })
    const member = req.params.name === '@me' && req.member ? req.member
      : await db.collection('members').findOne({ name: req.params.name })
    delete member._id
    if (!member) return res.status(404).send({ error: 'No member with this username exists!' })
    return res.status(200).send(member)
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}
