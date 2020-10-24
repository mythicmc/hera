/*
* - GET /forums/:memberId -> get list of visible forums for a user
* - GET /forum/:slug -> get forum by slug
* - GET /forum/:slug/threads -> get threads under forum by slug
* - POST /forum -> Create a new forum with name and pre-validated form constraints
* - PATCH /forum/:slug -> Edit an existing forum
*/
// TODO: Implement caching like in Gaia?
export const getVisibleForums: Endpoint = async (req, res, db) => {
  try {
    const roleIds = req.member?.roleIds ?? []
    const forums = await db.collection('forums').find({
      $or: [
        { readableRoleIds: { $exists: false } },
        { readableRoleIds: { $size: 0 } },
        { readableRoleIds: { $elemMatch: { $in: roleIds } } }
      ]
    }).toArray()
    return res.status(200).send(forums.map(forum => {
      delete forum._id
      return forum
    }))
  } catch (e) { console.error(e); return res.status(500).send({ error: 'Internal Server Error!' }) }
}

export const getForum: Endpoint = async (req, res, db) => {
  try {
    if (!req.params.slug) return res.status(404).send({ error: 'No forum slug specified!' })
    const forum = await db.collection('forums').findOne({ slug: req.params.slug })
    if (!forum) return res.status(404).send({ error: 'This forum does not exist!' })
    delete forum._id
    return res.status(200).send(forum)
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

export const getForumThreads: Endpoint = async (req, res, db) => {
  try {
    // Check if forum exists.
    if (!req.params.slug) return res.status(404).send({ error: 'No forum slug specified!' })
    const forum = await db.collection('forums').findOne({ slug: req.params.slug })
    if (!forum) return res.status(404).send({ error: 'This forum does not exist!' })
    delete forum._id
    // Get the threads.
    const threads = await db.collection('threads').find({ parentForumId: req.params.slug }).toArray()
    return res.status(200).send({
      forum,
      threads: threads.map(thread => {
        delete thread._id
        return thread
      })
    })
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

export const updateForum: Endpoint = async (req, res, db) => {
  try {
    if (!req.params.slug) return res.status(404).send({ error: 'No forum slug specified!' })
    else if (typeof req.body !== 'object') return res.status(400).send({ error: 'Invalid body!' })
    const forum = await db.collection('forums').findOne({ slug: req.params.slug })
    if (!forum) return res.status(404).send({ error: 'This forum does not exist!' })

    const patchedForum = {
      name: req.body.name ?? forum.name,
      slug: req.body.slug ?? forum.slug,
      description: req.body.description ?? forum.description,
      readableRoleIds: req.body.readableRoleIds ?? forum.readableRoleIds,
      writableRoleIds: req.body.writableRoleIds ?? forum.writableRoleIds,
      icon: req.body.icon ?? forum.icon
    }

    if (req.body.slug && req.body.slug !== forum.slug) {
      if (!/^[a-z0-9_-]*$/.test(req.body.slug)) return res.status(400).send({ error: 'Invalid slug!' })
      const existingForum = await db.collection('forums').findOne({ slug: req.body.slug })
      if (existingForum) return res.status(409).send({ error: 'A forum with this slug already exists!' })

      // Execute query to update all threads.
      await db.collection('threads').updateMany(
        { parentForumId: forum.slug }, { $set: { parentForumId: req.body.slug } }
      )
    }
    await db.collection('forums').updateOne({ slug: forum.slug }, { $set: patchedForum })
    return res.status(200).send(patchedForum)
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

export const createForum: Endpoint = async (req, res, db) => {
  try {
    // TODO: Form validation.
    // Required fields: name, slug, description
    // Optional fields: icon, readableRoleIds, writableRoleIds
    // Disallowed fields: id
    if (typeof req.body !== 'object') return res.status(400).send({ error: 'Invalid body!' })
    else if (
      typeof req.body.name !== 'string' ||
      typeof req.body.slug !== 'string' ||
      typeof req.body.description !== 'string'
    ) return res.status(400).send({ error: 'Invalid request body!' })
    else if (!/^[a-z0-9_-]*$/.test(req.body.slug)) return res.status(400).send({ error: 'Invalid slug!' })

    if ( // Check if forum with this slug already exists.
      await db.collection('forums').findOne({ slug: req.body.slug })
    ) return res.status(409).send({ error: 'A forum with this slug already exists!' })

    const forum = {
      name: req.body.name,
      slug: req.body.slug,
      description: req.body.description,
      readableRoleIds: req.body.readableRoleIds ?? [],
      writableRoleIds: req.body.writableRoleIds ?? [],
      icon: req.body.icon ?? ''
    }

    await db.collection('forums').insertOne(forum)
    return res.status(200).send(forum)
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}
