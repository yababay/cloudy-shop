import YDB from 'ydb-sdk'
import { YC } from './src/lib/yc.js'
import { Telegram, Context, Markup } from 'telegraf'
import { Update, UserFromGetMe } from 'telegraf/types'
import { Deunionize } from 'telegraf/typings/core/helpers/deunionize.js'
import { getDriver } from './src/lib/server/db/driver-cjs.js'
import { getCodes, getUnclosed, lackOfCodes } from './src/lib/server/db/fulfill.js'
import { getYDBTimestamp, intFromItem, intFromRows, isEmpty, rowsFromResultSets, stringFromItem, stringsFromQuery } from './src/lib/server/db/util.js'
import { getFullfilled, prepareAndSendItems } from './src/lib/server/db/delivery.js'

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

export async function handler (event: YC.CloudFunctionsHttpEvent, context: YC.CloudFunctionsHttpContext) {

    let payload: string | Deunionize<Update> = context.getPayload()
    if(typeof payload === 'string') payload = JSON.parse(payload) as  Deunionize<Update>

    console.log(`telegram is received: ${JSON.stringify(payload)}`)

    const ctx = new Context(payload, TG, BOT_INFO)

    const { text, message, callbackQuery } = ctx
    const data = ctx.callbackQuery?.['data']
    const { from } = message || callbackQuery

    const driver = await getDriver()

    
    await driver.tableClient.withSession(async (session) => {


        if(data) {
            const [ _, action, orderId ] = /^([a-z]+)_(\d+)$/.exec(data) || []
            let message: string

            switch(action){
                case 'no':
                    return await ctx.reply(`⏱️ Отправка заказа ${orderId} отложена.`)
                case 'uf':
                    message = await lackOfCodes(session, data)
                    return await ctx.reply(message, {parse_mode: 'HTML'})
                case 'ff':
                    const items = await getFullfilled(session, orderId)
                    message = items.reduce((acc, item) => {
                        const { id, code, offerId } = item
                        return acc + `✅ ${offerId} <code>${code}</code> (${id})\n\n` 
                    }, `Состав заказа № ${orderId}:\n\n`)
                    return await ctx.reply(message, {parse_mode: 'HTML', ...Markup.inlineKeyboard([
                        [
                            Markup.button.callback('📤 отравить', `go_${orderId}`),
                            Markup.button.callback('🛑 не отравлять', `no_${orderId}`),
                        ]
                    ])})
                default:
                    return await ctx.reply(`🤔 Команда не распознана…`)
            }
        }


        if(text.startsWith('/remove')){
            const [ _, code] = text.split(/\s+/)
            if(!code) return await ctx.reply(`🤔 Не удалось распознать код для удаления…`)
            const query = `delete from codes where code = '${code}' where order_id is null`
            console.log(query)
            await session.executeQuery(query)
            const rows = await getCodes(session)
            return ctx.reply(rows.join('\n\n'), {parse_mode: 'HTML'})
        }

        switch(text) {

            case '/start':
                return await ctx.reply('🤖 Этот бот помогает заполнять коды для цифровых товаров компании Activation Service.\n\nВведите `/`, чтобы увидеть список доступных команд.', {parse_mode: 'Markdown'})
                
            case '/help':
                return await ctx.reply('📖 Пользуйтесь командами меню (`/check`, `/codes` и др.) или вводите коды активации построчно, например `APPLE500 qwerty12345`.', {parse_mode: 'Markdown'})

            case '/codes':
                const rows = await getCodes(session)
                if(!rows.length) return await ctx.reply(`🤔 Коды еще не добавлены…`)
                return await ctx.reply(rows.join('\n\n'), {parse_mode: 'HTML'})

            case '/send':
                const unclosed = await getUnclosed(session, true)
                if(!unclosed.length) return await ctx.reply(`🤔 Новых заполненных заказов не обнаружено…`)
                for(const id of unclosed){
                    const chatUrl = await prepareAndSendItems(session, id)
                    let message = `📨 Заказ № ${id} отправлен маркету.`
                    if(chatUrl) message += ` Предоставьте недостающие коды [в чате](${chatUrl})`
                    await ctx.reply(message, {parse_mode: 'Markdown'})
                    await session.executeQuery(`update ordered_items set fulfilled_at = ${getYDBTimestamp()} where order_id = ${id}`)
                }
                return

            case '/deliver':
            case '/delivery':
                const fulfilled = await getUnclosed(session, true)
                if(!fulfilled.length) return await ctx.reply('📭 Заполненных и неотправленных заказов не обнаружено.')
                return await ctx.reply(`📬 ${fulfilled.length === 1 ? 'Неотправленный заказ' : 'Неотправленные заказы'}:`, Markup.inlineKeyboard(
                    fulfilled.map(id => [`№ ${id}`, `ff_${id}`]).map(([title, num]) => Markup.button.callback(title, num))
                ))
    
            case '/check':
                const ids = await getUnclosed(session)
                if(!ids.length) return await ctx.reply('🎉 Незаполненных заказов не обнаружено.')
                if(ids.length === 1){
                    const [ id ] = ids
                    const message = await lackOfCodes(session, id)
                    return await ctx.reply(message, {parse_mode: 'HTML'})
                }
                else return await ctx.reply(`⏱️ Недостаточно кодов для ${ids.length === 1 ? 'заказа' : 'заказов'}:`, Markup.inlineKeyboard(
                    ids.map(id => [`№ ${id}`, `uf_${id}`]).map(([title, num]) => Markup.button.callback(title, num))
                ))

            default:

                const offers = await stringsFromQuery(session, `select id from offers`)

                let codes = text.trim()
                    .split(/[\r\n]+/)
                    .map(row => row.split(/\s+/))
                
                let count = codes.length

                codes = codes
                    .filter(arr => arr.length === 2 &&  offers.includes(arr[0]))

                if(!codes.length) return await ctx.reply(`🤔 Не удалось распознать команду или коды в тексте (<code>${text.slice(0, 20)}</code>).`, {parse_mode: 'HTML'})

                let success = 0
                
                for(const [offer, code] of codes) {
                    if(!isEmpty(await session.executeQuery(`select code from codes where code = '${code}'`))) continue
                    await session.executeQuery(`insert into codes (offer_id, code, created_at, user) values ('${offer}', '${code}', ${getYDBTimestamp()}, ${from.id})`)
                    success++
                }

                const message = success === count ? `🎉 Все строки успешно обработаны.` : `🤔 Успешно обработано ${success} строк из ${count}. Проверьте корректность заполнения. Каждая строка должна содержать только зарегистрированный идентификатор товара (SKU) и код активизации, разделенные пробелом. Возможно, некоторые коды были ранее внесены в базу данных.`
                await ctx.reply(message)
        }
    })

    await driver.destroy()

    return {
        statusCode: 200,
        body: JSON.stringify({ status: "ok" }),
        'headers': {
            'Content-Type': 'application/json',
        },
        isBase64Encoded: false
    }
}
