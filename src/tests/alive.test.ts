import test from 'ava'
import { makeFetch } from 'supertest-fetch'
import server from '../index'
import { Server } from 'http'

const fetch = makeFetch((server as any).server as Server)

test('hera is alive', async t => {
  const response = await fetch('/').expect(200)
    .expect('content-type', 'application/json')
    // .expect({ Hotel: 'Trivago', alive: true })
  t.is((await response.json()).Hotel, 'Trivago')
}
)
