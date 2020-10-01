import Express from 'express'
import { Db } from 'mongodb'

declare global {
  type Endpoint = (req: Express.Request, res: Express.Response, db: Db) => void

  // TODO: Database interfaces.
}
