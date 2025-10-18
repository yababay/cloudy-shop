import { Telegram } from 'telegraf'
import type { ParseMode } from 'telegraf/types'
import type { Item } from '../../types/yandex.js'
import { Context } from 'telegraf'

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
    let message = `🆗 От Маркета получен заказ № ${orderId}.`
    await sendMessage(message)
}

export const sendDeliveryMessage = async (orderId: number | string, chat: string, ctx?:  Context) => {
    let message = `📨 Заказ № ${orderId} отправлен маркету.`
    if(chat) message += ` Предоставьте недостающие коды [в чате](${chat})`
    if(ctx)  await ctx.reply(message, {parse_mode: 'Markdown'})
    else await sendMessage(message)
}

export const sendOrderDeliveredMessage = async (orderId: number) => {
    let message = `🏁 Заказ № ${orderId} доставлен получателю.`
    await sendMessage(message)
}

export const sendErrorMessage = async (orderId: number | string, err: unknown) => {
    if(typeof err !== 'string') err = JSON.stringify(err)
    let message = `❌ При обработке заказа № ${orderId} произошла ошибка: ${err}.`
    await sendMessage(message)
}

export const sendProcessingStartedMessage = async (orderId: number | string, items: Item[], codes: Map<string, string[]>) => { //order: Order, sum: number, count: number) => {
    const basket = (items || []).map(({offerId, count}) => `${offerId} (${count})`).join(', ')
    let message = `⏱️ Состав заказа № ${orderId}: ${basket}.`
    const ff = Array.from(codes.entries()).reduce((acc, arr) => acc + arr.length, 0)
    const count = items.reduce((acc, {count}) => acc + count, 0)
    const lack = count - ff
    if(!lack) message += ` Заказ обеспечен кодами и будет обработан автоматически.`
    else message += ` Заполнено кодов: ${ff} из ${count}. Перейдите к [боту 🤖](https://t.me/activation_service_bot), чтобы добавить.`
    await sendMessage(message)
}
