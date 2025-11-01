import { Telegram, Context } from 'telegraf'
import type { UserFromGetMe } from "telegraf/types"
import type { YC } from '../../yc.js'
import { getEnvironmentByName } from '$lib/util/env.js'

const TELEGRAM_BOT_TOKEN = getEnvironmentByName('TELEGRAM_BOT_TOKEN')
const TG = new Telegram(TELEGRAM_BOT_TOKEN)

export const BOT_INFO: UserFromGetMe = {
    is_bot: true, username: 'activation_service_bot',
    can_join_groups: false,
    can_read_all_group_messages: false,
    supports_inline_queries: true,
    id: 0,
    first_name: 'Activation Service Bot'
}

export const REPLY = {
    statusCode: 200,
    body: JSON.stringify({ status: "ok" }),
    'headers': {
        'Content-Type': 'application/json',
    },
    isBase64Encoded: false
}

export const parsePayload = (context: YC.CloudFunctionsHttpContext) => {    
    let payload: string = context.getPayload()
    if(typeof payload === 'string') payload = JSON.parse(payload)
    const ctx = Reflect.construct(Context, [payload, TG, BOT_INFO]) as Context
    const { text, message, callbackQuery } = ctx
    const data = Reflect.get(callbackQuery || {}, 'data') as string | undefined
    const { from } = message || callbackQuery || {}
    const uid = from?.id
    if(typeof uid !== 'number') throw 'no user id in telegram'
    return { ctx, text, data, uid }
}

