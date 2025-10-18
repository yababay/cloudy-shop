import { Telegram, Context, Markup } from 'telegraf'
import type { YC } from '../../yc.js'
import type { UserFromGetMe } from 'telegraf/types'
import { findUnfulfilled, getCodes, lackOfCodes } from '../queries/bot.js'
import { getDriver } from '../ydb/driver.js'
import { getYDBTimestamp, isEmpty, stringsFromQuery } from '../ydb/util.js'
import { deliverAll } from '../queries/delivery.js'

const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL } = process.env

const TG = new Telegram(TELEGRAM_BOT_TOKEN || '')

const BOT_INFO: UserFromGetMe = {
    is_bot: true, username: 'activation_service_bot',
    can_join_groups: false,
    can_read_all_group_messages: false,
    supports_inline_queries: true,
    id: 0,
    first_name: 'Activation Service Bot'
}

const reply = {
    statusCode: 200,
    body: JSON.stringify({ status: "ok" }),
    'headers': {
        'Content-Type': 'application/json',
    },
    isBase64Encoded: false
}

export const telegram = async (event: YC.CloudFunctionsHttpEvent, context: YC.CloudFunctionsHttpContext) => {
    let payload: string = context.getPayload()
    if(typeof payload === 'string') payload = JSON.parse(payload)
    const ctx = Reflect.construct(Context, [payload, TG, BOT_INFO]) as Context
    const { text, message, callbackQuery } = ctx
    const data = Reflect.get(callbackQuery || {}, 'data') as string | undefined
    const { from } = message || callbackQuery || {}
    const userId = from?.id
    if(typeof userId !== 'number') throw 'no user id in telegram'

    if(data) {
        const [ _, action, orderId ] = /^([a-z]+)_(\d+)$/.exec(data) || []

        const driver = await getDriver()

        await driver.tableClient.withSession(async (session) => {

            switch(action){
                case 'deliver':
                    await deliverAll(session, true)
                    break
                case 'cancel':
                    await ctx.reply(`⏱️ Отправка заказов отложена.`)
                    break
                case 'uf':
                    await lackOfCodes(session, orderId, ctx)
                    break
                default:
                    await ctx.reply(`🤔 Команда не распознана…`)
            }
        })

        await driver.destroy()
        return reply
    }

    if(typeof text !== 'string') throw 'no text in telegram'
        
    if(text.startsWith('/remove')){
        const [ _, code] = text.split(/\s+/)
        if(!code) return await ctx.reply(`🤔 Не удалось распознать код для удаления…`)
        const driver = await getDriver()
        const codes = await driver.tableClient.withSession(async (session) => {
            await session.executeQuery(`delete from codes where code = '${code}' where order_id is null`)
            return await getCodes(session)
        })
        ctx.reply(codes, {parse_mode: 'HTML'})
        await driver.destroy()
        return reply
    }

    if(text === '/start') {
        await ctx.reply('🤖 Этот бот помогает заполнять коды для цифровых товаров компании Activation Service.\n\nВведите `/`, чтобы увидеть список доступных команд.', {parse_mode: 'Markdown'})
        return reply
    }
        
    if(text === '/help') {
        await ctx.reply('📖 Пользуйтесь командами меню (`/check`, `/codes` и др.) или вводите коды активации построчно, например\n\n `APPLE500 qwerty12345`\n`APPLE550 asdfgh67890`.', {parse_mode: 'Markdown'})
        return reply
    }

    const driver = await getDriver()
    await driver.tableClient.withSession(async (session) => {

        switch(text) {

            case '/codes':
                ctx.reply(await getCodes(session), {parse_mode: 'HTML'})
                break

            case '/check':
                await findUnfulfilled(session, ctx)
                break

            case '/deliver':
            case '/delivery':
                await ctx.reply('Отправить незаполненные заказы?', {parse_mode: 'HTML', ...Markup.inlineKeyboard([
                    [
                        Markup.button.callback('📤 отравить', `deliver`),
                        Markup.button.callback('🛑 не отравлять', `cancel`),
                    ]
                ])})
                break
    
            default:

                const offers = await stringsFromQuery(session, `select id from offers`)

                let codes = text.trim()
                    .split(/[\r\n]+/)
                    .map(row => row.split(/\s+/))
                
                let { length } = codes

                codes = codes.filter(arr => arr.length === 2 &&  offers.includes(arr[0]))

                
                let success = 0
                
                for(const [offer, code] of codes) {
                    if(!isEmpty(await session.executeQuery(`select code from codes where code = '${code}'`))) continue
                    await session.executeQuery(`insert into codes (offer_id, code, created_at, user) values ('${offer}', '${code}', ${getYDBTimestamp()}, ${userId})`)
                    success++
                }
                
                if(!length) await ctx.reply(`🤔 Не удалось распознать команду или коды в тексте (<code>${text.slice(0, 20)}</code>).`, {parse_mode: 'HTML'})
                else if(success !== length) {
                    const message = `🤔 Успешно обработано ${success} строк из ${length}. Проверьте корректность заполнения. Каждая строка должна содержать только зарегистрированный идентификатор товара (SKU) и код активизации, разделенные пробелом. Возможно, некоторые коды были ранее внесены в базу данных.`
                    await ctx.reply(message)
                }
                else await findUnfulfilled(session, ctx)

        }
    })

    await driver.destroy()
    return reply

}
