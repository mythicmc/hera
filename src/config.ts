// Shim to avoid TypeScript errors. Potentially dumb.
import fs from 'fs'
import { join } from 'path'
// __dirname will break with the move to ES Modules.
export default JSON.parse(fs.readFileSync(join(__dirname, '../config.json'), { encoding: 'utf8' }))
