import anyTest, { TestInterface } from 'ava'
import { FetchFunction, makeFetch, Response } from 'supertest-fetch'
import { Server } from 'http'
import server, { connected } from '../index'

// eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
const test = anyTest as TestInterface<{ fetch: FetchFunction }>

test.before(async t => {
  t.timeout(5000, 'Database/server took too long to connect/start!')
  await connected // Rely on the server to have begun listening (should make the behavior better).
  t.context.fetch = makeFetch((server as any).server as Server)
})

test('hera is alive', async t => {
  let res: unknown
  await t.notThrowsAsync(async () => {
    res = await t.context.fetch('/')
      .expect(200)
      .expect('content-type', 'application/json')
      // .expectBody({ Hotel: 'Trivago', alive: true })
  })
  const body = await (res as Response).json()
  t.like(body, { alive: true, Hotel: 'Trivago' })
  t.is(typeof body.timestamp, 'number')
})
