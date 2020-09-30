import { Db } from 'mongodb'

export default async (db: Db) => {
  const collation = { strength: 1, locale: 'en' } // Case insensitive collation for string indexes.

  // Members.
  const collections = await db.collections()
  if (!collections.some(c => c.collectionName === 'members')) {
    await db.createCollection('members', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'name', 'ip', 'email', 'createdOn', 'roleIds', 'validated', 'lastLogin'],
          additionalProperties: false,
          properties: {
            _id: { bsonType: 'objectId' },
            // id: { bsonType: 'int' },
            discordId: { bsonType: 'string' }, // Optional.
            name: { bsonType: 'string' },
            avatar: { bsonType: 'string' }, // Optional.
            splash: { bsonType: 'string' }, // Optional.
            ip: { bsonType: 'string' },
            email: { bsonType: 'string' },
            createdOn: { bsonType: 'date' },
            roleIds: { bsonType: 'array', uniqueItems: true, items: { bsonType: 'string' } },
            signature: { bsonType: 'string' }, // Optional.
            validated: { bsonType: 'bool' },
            lastLogin: { bsonType: 'date' }
          }
        }
      }
    })
    // await db.createIndex('members', { id: 1 }, { name: 'member_id', unique: true })
    await db.createIndex('members', { name: 1 }, { name: 'member_name', unique: true, collation })
    await db.createIndex('members', { email: 1 }, { name: 'member_email', unique: true, collation })
  }

  // Threads.
  if (!collections.some(c => c.collectionName === 'threads')) {
    await db.createCollection('threads', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'title', 'parentForumId', 'authorId', 'createdOn', 'closed', 'pinned', 'hidden'],
          additionalProperties: false,
          properties: {
            _id: { bsonType: 'objectId' },
            id: { bsonType: 'int' }, // TODO
            title: { bsonType: 'string' },
            parentForumId: { bsonType: 'int' },
            poll: { // Optional.
              bsonType: 'object',
              properties: {},
              additionalProperties: { bsonType: 'object' },
              minProperties: 1,
              maxProperties: 10
            },
            authorId: { bsonType: 'string' },
            createdOn: { bsonType: 'date' },
            closed: { bsonType: 'bool' },
            pinned: { bsonType: 'bool' },
            hidden: { bsonType: 'bool' }
          }
        }
      }
    })
    await db.createIndex('threads', { id: 1 }, { name: 'thread_id', unique: true })
  }

  // Forums.
  if (!collections.some(c => c.collectionName === 'forums')) {
    await db.createCollection('forums', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'name', 'slug'],
          additionalProperties: false,
          properties: {
            _id: { bsonType: 'objectId' },
            // id: { bsonType: 'int' },
            name: { bsonType: 'string' },
            slug: { bsonType: 'string' },
            // Optional properties.
            description: { bsonType: 'string' },
            readableRoleIds: { bsonType: 'array', uniqueItems: true, items: { bsonType: 'int' } },
            writableRoleIds: { bsonType: 'array', uniqueItems: true, items: { bsonType: 'int' } },
            icon: { bsonType: 'string' }
          }
        }
      }
    })
    // await db.createIndex('forums', { id: 1 }, { name: 'forum_id', unique: true })
    await db.createIndex('forums', { slug: 1 }, { name: 'forum_slug', unique: true, collation })
  }

  // Posts.
  if (!collections.some(c => c.collectionName === 'posts')) {
    await db.createCollection('posts', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['id', 'authorId', 'content', 'rawContent', 'threadId', 'createdOn'],
          additionalProperties: false,
          properties: {
            _id: { bsonType: 'objectId' },
            id: { bsonType: 'int' }, // TODO
            authorId: { bsonType: 'string' },
            content: { bsonType: 'string' },
            rawContent: { bsonType: 'string' },
            threadId: { bsonType: 'int' },
            createdOn: { bsonType: 'date' },
            logs: {
              bsonType: 'array',
              uniqueItems: true,
              items: {
                bsonType: 'object',
                required: ['editorId', 'editTime', 'oldContent', 'reason'],
                additionalProperties: false,
                properties: {
                  editorId: { bsonType: 'int' },
                  editTime: { bsonType: 'date' },
                  oldContent: { bsonType: 'string' },
                  reason: { bsonType: 'string' }
                }
              }
            },
            likes: { bsonType: 'array', uniqueItems: true, items: { bsonType: 'int' } },
            dislikes: { bsonType: 'array', uniqueItems: true, items: { bsonType: 'int' } }
          }
        }
      }
    })
    await db.createIndex('posts', { id: 1 }, { name: 'post_id', unique: true })
    await db.createIndex('posts', { content: 'text' }, { name: 'post_content' })
  }

  // Tokens.
  if (!collections.some(c => c.collectionName === 'tokens')) {
    await db.createCollection('tokens', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['memberId', 'accessToken', 'refreshToken', 'createdOn'],
          additionalProperties: false,
          properties: {
            _id: { bsonType: 'objectId' },
            memberId: { bsonType: 'string' },
            accessToken: { bsonType: 'string' },
            refreshToken: { bsonType: 'string' },
            createdOn: { bsonType: 'date' }
          }
        }
      }
    })
    await db.createIndex('tokens', { memberId: 1 }, { name: 'token_memberId', collation })
  }

  // Hashes.
  if (!collections.some(c => c.collectionName === 'hashes')) {
    await db.createCollection('hashes', {
      validator: {
        $jsonSchema: {
          bsonType: 'object',
          required: ['memberId', 'hash'],
          additionalProperties: false,
          properties: {
            _id: { bsonType: 'objectId' },
            memberId: { bsonType: 'string' },
            hash: { bsonType: 'string' }
          }
        }
      }
    })
    await db.createIndex('hashes', { memberId: 1 }, { name: 'hash_memberId', unique: true, collation })
  }

  // TODO: Friends.
}
