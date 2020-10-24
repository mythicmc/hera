import Express from 'express'
import { Db, ObjectId } from 'mongodb'

declare global {
  interface ApiRequest extends Express.Request { member?: DbMember }
  type Endpoint = (req: ApiRequest, res: Express.Response, db: Db) => void

  // Database interfaces.
  interface Member {
    discordId?: string,
    name: string,
    avatar?: string,
    splash?: string,
    ip: string,
    email: string,
    createdOn: Date,
    roleIds: string[],
    signature?: string,
    validated: boolean,
    lastLogin: Date
  }
  interface DbMember extends Member { _id: ObjectId }

  interface Forum {
    name: string,
    slug: string,
    description?: string,
    readableRoleIds?: number[],
    writableRoleIds?: number[],
    icon?: string
  }
  interface DbForum extends Forum { _id: ObjectId }

  interface Thread {
    id: string,
    title: string,
    parentForumId: string,
    poll: { [key: string]: string[] },
    authorId: string,
    createdOn: Date,
    closed: boolean,
    pinned: boolean,
    hidden: boolean
  }
  interface DbThread extends Thread { _id: ObjectId }

  interface Post {
    id: string,
    authorId: string,
    content: string,
    rawContent: string,
    threadId: string,
    createdOn: Date,
    logs?: Array<{ editorId: string, editTime: Date, oldContent: string, reason: string }>,
    likes?: string[],
    dislikes?: string[]
  }
  interface DbPost extends Post { _id: ObjectId }
}
