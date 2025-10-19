import type { Context } from "telegraf"
import type { UserFromGetMe } from "telegraf/types"

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

