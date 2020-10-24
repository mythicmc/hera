import { Client } from 'eris'
import config from './config'

const client = new Client('', { restMode: true })

const truncate = (text: string, length: number) => (
  text.length > length ? text.substr(0, length) + '...' : text
)

export default async function (post: Post, avatar?: string, title?: string) {
  if (!config.discordWebhookId || !config.discordWebhookToken) return
  return await client.executeWebhook(config.discordWebhookId, config.discordWebhookToken, {
    allowedMentions: {},
    content: '**New forum post!**\nTODO Fixme b*',
    embeds: [{
      author: { icon_url: avatar, name: post.authorId },
      color: 0xFFFFFF,
      title: title ?? undefined,
      description: truncate(post.content, 1600)
    }]
  })
}
