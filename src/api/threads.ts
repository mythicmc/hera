import { customAlphabet } from 'nanoid/async'
import discord from '../discord'

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const nanoid = customAlphabet(alphabet, 12)

/*
* - GET /api/thread/:id - Get thread by ID with replies.
* - GET /api/thread/:id/replies - Get replies to a thread. TODO: Extraneous?
* - POST /api/thread - Create a new thread.
* - PATCH /api/thread/:id - Update an existing thread.
*/
export const getThread: Endpoint = async (req, res, db) => {
  try {
    if (!req.params.id) return res.status(404).send({ error: 'No thread ID specified!' })
    const thread = await db.collection('threads').findOne({ id: req.params.id })
    if (!thread) return res.status(404).send({ error: 'This thread does not exist!' })
    delete thread._id
    // Get the replies.
    const posts = await db.collection('posts').find({ threadId: req.params.id }).toArray()
    return res.status(200).send({
      thread,
      posts: posts.map(post => {
        delete post._id
        return post
      })
    })
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

export const getThreadReplies: Endpoint = async (req, res, db) => {
  try {
    // Check if thread exists.
    if (!req.params.id) return res.status(404).send({ error: 'No thread ID specified!' })
    const thread = await db.collection('threads').findOne({ id: req.params.id })
    if (!thread) return res.status(404).send({ error: 'This thread does not exist!' })
    delete thread._id
    // Get the replies.
    const posts = await db.collection('posts').find({ threadId: req.params.id }).toArray()
    return res.status(200).send(posts.map(post => {
      delete post._id
      return post
    }))
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

/*
TODO:
export const updateThread: Endpoint = async (req, res, db) => {
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
*/

export const createThread: Endpoint = async (req, res, db) => {
  try {
    // TODO: Form validation.
    // Required fields: title, parentForumId, content (map to rawContent)
    // Optional fields: poll, pinned, closed, hidden
    // Disallowed fields: id, rawContent, authorId, createdOn
    // Fields left to validate: hasPoll, content
    if (typeof req.body !== 'object') return res.status(400).send({ error: 'Invalid body!' })
    else if (
      typeof req.body.title !== 'string' ||
      typeof req.body.content !== 'string' ||
      typeof req.body.parentForumId !== 'string'
    ) return res.status(400).send({ error: 'Invalid request body!' })

    if ( // Check if forum with this slug exists.
      !(await db.collection('forums').findOne({ slug: req.body.parentForumId }))
    ) return res.status(404).send({ error: 'No forum exists with this slug!' })

    const thread = {
      id: await nanoid(),
      title: req.body.title,
      authorId: req.member?.name ?? '',
      parentForumId: req.body.parentForumId,
      pinned: req.body.pinned === true,
      closed: req.body.closed === true,
      hidden: req.body.hidden === true,
      createdOn: new Date()
      // TODO: Poll.
    }
    const post = {
      id: await nanoid(),
      authorId: req.member?.name ?? '',
      content: req.body.content,
      rawContent: req.body.content,
      threadId: thread.id,
      createdOn: thread.createdOn
    }

    await db.collection('threads').insertOne(thread)
    await db.collection('posts').insertOne(post)
    discord(post).catch(e => console.error('Error executing webhook!', e))
    return res.status(200).send(
      Object.assign(thread, { content: req.body.content, rawContent: req.body.content })
    )
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}
