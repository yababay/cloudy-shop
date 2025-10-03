import { Telegram } from 'telegraf'
import type { ParseMode } from 'telegraf/types'
import { Order } from '../types/index.js'

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL } = process.env
if(!(TELEGRAM_BOT_TOKEN && TELEGRAM_CHANNEL)) throw 'please setup telegram token and channel'

const TG = new Telegram(TELEGRAM_BOT_TOKEN || '')

type MessageOptions = {
    parse_mode: ParseMode,
    caption?: string,
    link_preview_options: {is_disabled: boolean}
}

const OPTIONS: MessageOptions = {
    parse_mode: 'Markdown',
    link_preview_options: {is_disabled: true}
}

export const sendMessage = async (message: string) => {
    await TG.sendMessage(TELEGRAM_CHANNEL, message, OPTIONS)
}

export const sendOrderCreatedMessage = async (orderId: number) => {
    let message = `🆗 От Маркета получен заказ № ${orderId}.`
    await sendMessage(message)
}

export const sendProcessingStartedMessage = async (order: Order) => {
    const { id, items } = order
    const basket = (items || []).map(({offerId, count}) => `${offerId} (${count})`).join(', ')
    let message = `⏱️ Заказ № ${id} принят в обработку. Состав: ${basket}.`
    await sendMessage(message)
}
