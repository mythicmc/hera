import { customAlphabet } from 'nanoid/async'
import discord from '../discord'

const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
const nanoid = customAlphabet(alphabet, 12)

/*
* - GET /api/post/:id - Get post by ID.
* - POST /api/post/:threadId - Create a new post.
* - POST /api/post/:id/like (and dislike) - Like or dislike a post.
* - DELETE /api/post/:id/like - Remove a like/dislike from a post.
* - PATCH /api/post/:id - Update an existing post and create edit logs for the same.
*/
export const getPost: Endpoint = async (req, res, db) => {
  try {
    if (!req.params.id) return res.status(404).send({ error: 'No post ID specified!' })
    const post = await db.collection('posts').findOne({ id: req.params.id })
    if (!post) return res.status(404).send({ error: 'This post does not exist!' })
    delete post._id
    return res.status(200).send(post)
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

export const likePost: Endpoint = async (req, res, db) => {
  try {
    if (!req.params.id) return res.status(404).send({ error: 'No post ID specified!' })
    const post = await db.collection('posts').findOne({ id: req.params.id })
    if (!post) return res.status(404).send({ error: 'This post does not exist!' })

    // Add like.
    if (post.likes && post.likes.indexOf(req.member?.name) === -1) {
      post.likes.push(req.member?.name)
    } else if (!post.likes) post.likes = [req.member?.name]
    // Remove dislike.
    if (post.dislikes) {
      const dislike = post.dislikes.indexOf(req.member?.name)
      if (dislike !== -1) post.dislikes.splice(dislike, 1)
    }

    const result = await db.collection('posts').updateOne(
      { id: post.id }, { $set: { likes: post.likes, dislikes: post.dislikes ?? [] } }
    )
    return res.status(200).send({ success: result.modifiedCount === 1 })
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

export const dislikePost: Endpoint = async (req, res, db) => {
  try {
    if (!req.params.id) return res.status(404).send({ error: 'No post ID specified!' })
    const post = await db.collection('posts').findOne({ id: req.params.id })
    if (!post) return res.status(404).send({ error: 'This post does not exist!' })

    // Add dislike.
    if (post.dislikes && post.dislikes.indexOf(req.member?.name) === -1) {
      post.dislikes.push(req.member?.name)
    } else if (!post.dislikes) post.dislikes = [req.member?.name]
    // Remove like.
    if (post.likes) {
      const like = post.likes.indexOf(req.member?.name)
      if (like !== -1) post.likes.splice(like, 1)
    }

    const result = await db.collection('posts').updateOne(
      { id: post.id }, { $set: { likes: post.likes ?? [], dislikes: post.dislikes } }
    )
    return res.status(200).send({ success: result.modifiedCount === 1 })
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}

export const removePostLike: Endpoint = async (req, res, db) => {
  try {
    if (!req.params.id) return res.status(404).send({ error: 'No post ID specified!' })
    const post = await db.collection('posts').findOne({ id: req.params.id })
    if (!post) return res.status(404).send({ error: 'This post does not exist!' })

    // Remove like.
    if (post.likes) {
      const like = post.likes.indexOf(req.member?.name)
      if (like !== -1) post.likes.splice(like, 1)
    }
    // Remove dislike.
    if (post.dislikes) {
      const like = post.dislikes.indexOf(req.member?.name)
      if (like !== -1) post.dislikes.splice(like, 1)
    }

    const result = await db.collection('posts').updateOne(
      { id: post.id }, { $set: { likes: post.likes ?? [], dislikes: post.dislikes ?? [] } }
    )
    return res.status(200).send({ success: result.modifiedCount === 1 })
  } catch (e) { console.error(e); return res.status(500).send({ error: 'Internal Server Error!' }) }
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

export const createPost: Endpoint = async (req, res, db) => {
  try {
    // TODO: Form validation.
    // Required fields: content (map to rawContent)
    // Optional fields: N/A
    // Disallowed fields: id, rawContent, authorId, createdOn, threadId (already specified in path), likes, dislikes, logs
    // Fields left to validate: content
    if (typeof req.body !== 'object') return res.status(400).send({ error: 'Invalid body!' })
    else if (typeof req.body.content !== 'string') return res.status(400).send({ error: 'Missing content!' })
    else if (typeof req.params.threadId !== 'string') return res.status(400).send({ error: 'Missing thread ID!' })

    if ( // Check if thread with this ID exists.
      !(await db.collection('threads').findOne({ id: req.params.threadId }))
    ) return res.status(404).send({ error: 'No thread exists with this ID!' })

    const post = {
      id: await nanoid(),
      authorId: req.member?.name ?? '',
      content: req.body.content,
      rawContent: req.body.content,
      threadId: req.params.threadId,
      createdOn: new Date()
    }

    await db.collection('posts').insertOne(post)
    discord(post).catch(e => console.error('Error executing webhook!', e))
    return res.status(200).send(post)
  } catch (e) { return res.status(500).send({ error: 'Internal Server Error!' }) }
}
