import YDB from 'ydb-sdk'
import { YC } from './src/lib/yc.js'
import { Telegram, Context, Markup } from 'telegraf'
import { Update, UserFromGetMe } from 'telegraf/types'
import { Deunionize } from 'telegraf/typings/core/helpers/deunionize.js'
import { getDriver } from './src/lib/server/db/driver-cjs.js'
import { getCodes, getUnfilled, lackOfCodes } from './src/lib/server/db/fulfill.js'
import { getYDBTimestamp, intFromItem, intFromRows, isEmpty, rowsFromResultSets, stringFromItem, stringsFromQuery } from './src/lib/server/db/util.js'

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

    const { text } = ctx
    const data = ctx.callbackQuery?.['data']

    const driver = await getDriver()

    
    await driver.tableClient.withSession(async (session) => {


        if(data) {
            const message = await lackOfCodes(session, data)
            return await ctx.reply(message, {parse_mode: 'HTML'})
        }


        if(text.startsWith('/delete')){
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
                return await ctx.reply('📖 Пользуйтесь командами (`/check`, `/codes` и др.) или вводите коды активации построчно, например `APPLE500 qwerty12345`.', {parse_mode: 'Markdown'})

            case '/codes':
                const rows = await getCodes(session)
                if(!rows.length) return await ctx.reply(`🤔 Коды еще не добавлены…`)
                return await ctx.reply(rows.join('\n\n'), {parse_mode: 'HTML'})

            case '/check':
                const ids = await getUnfilled(session)
                if(!ids.length) return await ctx.reply('🎉 Незаполненных заказов не обнаружено.')
                if(ids.length === 1){
                    const [ id ] = ids
                    const message = await lackOfCodes(session, id)
                    return await ctx.reply(message, {parse_mode: 'HTML'})
                }
                else return await ctx.reply(`⏱️ Недостаточно кодов для ${ids.length === 1 ? 'заказа' : 'заказов'}:`, Markup.inlineKeyboard(
                    ids.map(id => [`№ ${id}`, id + '']).map(([title, num]) => Markup.button.callback(title, num))
                ))

            default:

                const offers = await stringsFromQuery(session, `select id from offers`)

                let codes = text.trim()
                    .split(/[\r\n]+/)
                    .map(row => row.split(/\s+/))
                
                let count = codes.length

                codes = codes
                    .filter(arr => arr.length === 2 &&  offers.includes(arr[0]))

                if(!codes.length) return await ctx.reply('🤔 Не удалось распознать коды в тексте.')

                let success = 0
                
                for(const [offer, code] of codes) {
                    if(!isEmpty(await session.executeQuery(`select code from codes where code = '${code}'`))) continue
                    await session.executeQuery(`insert into codes (offer_id, code, created_at) values ('${offer}', '${code}', ${getYDBTimestamp()})`)
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

/*
{
    "update_id":949119052,
    "message":{
        "message_id":79,
        "from":{"id":43962820,"is_bot":false,"first_name":"Михаил","last_name":"Беляков","username":"yababay","language_code":"ru"},
        "chat":{"id":43962820,"first_name":"Михаил","last_name":"Беляков","username":"yababay","type":"private"},
        "date":1759758271,"text":
        "/start",
        "entities":[{"offset":0,"length":6,"type":"bot_command"}]
    }
}
const OPTIONS = {
    parse_mode: 'Markdown',
    reply_markup: {
        keyboard: [
        [["Option 1"],
        ["Option 2"]]
        ],
        resize_keyboard: true
    }
}

*/



