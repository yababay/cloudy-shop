import { Datetime, Uint64 } from '@ydbjs/value/primitive'
import type { QueryClient } from '@ydbjs/query'
import type { Context } from 'telegraf'

export const parseActions = async (sql: QueryClient, data: string, ctx: Context) => {
    return true
}

export const parseCommands = async (sql: QueryClient, text: string, ctx: Context) => {

    if(text.startsWith('/remove')){
        const [ _, code] = text.split(/\s+/)
        if(!code) return await ctx.reply(`🤔 Не удалось распознать код для удаления.`)
        await sql`delete from codes where code = ${code} and order_id is null`
        const codes = await getCodes(sql)
        await ctx.reply(codes, {parse_mode: 'HTML'})
        return true
    }

    switch(text) {

        case '/codes':
            const codes = await getCodes(sql)
            await ctx.reply(codes, {parse_mode: 'HTML'})
            return true

        /*case '/check':
            //await findUnfulfilled(session, ctx)
            return true

        case '/deliver':
        case '/delivery':
            const ids = await getUnclosed(session)
            if(ids.length) await ctx.reply('Отправить незаполненные заказы?', {parse_mode: 'HTML', ...Markup.inlineKeyboard([
                [
                    Markup.button.callback('📤 отравить', `deliver`),
                    Markup.button.callback('🛑 не отравлять', `cancel`),
                ]
            ])})
            else await ctx.reply(`🤔 Неотправленных заказов пока нет.`)
            return true*/
    }

    return false
}

const getCodes = async (sql: QueryClient) => {
    const [ rows ] = await sql`select offer_id as offer, code from codes where order_id is null`
    return rows
        .map(row => {
            const {  offer, code, } = row as { offer: string, code: string }
            return [ offer, code ]
        })
        .map(([ offer, code ]) => `<code>${offer}</code> ${code}`)
        .join('\n\n')
}

    /*
import { getDriver } from '../ydb/driver.js'
import { simpleReplies, textFromDatabase } from './text.js'
import type { Driver } from 'ydb-sdk'
import { actionsFromDatabase } from './action.js'



export const telegram = async (event: YC.CloudFunctionsHttpEvent, context: YC.CloudFunctionsHttpContext) => {
    
    let payload: string = context.getPayload()
    if(typeof payload === 'string') payload = JSON.parse(payload)
    const ctx = Reflect.construct(Context, [payload, TG, BOT_INFO]) as Context

    await ctx.reply('Бот пока не работает. Тестируем отправку и доставку.')

    const { text, message, callbackQuery } = ctx
    const data = Reflect.get(callbackQuery || {}, 'data') as string | undefined
    const { from } = message || callbackQuery || {}
    const userId = from?.id
    if(typeof userId !== 'number') throw 'no user id in telegram'

    let driver: Driver | undefined

    console.log('data and text', data, text)

    try {
        if(data) {
            driver = await getDriver()

            await driver.tableClient.withSession(async (session) => {
                await actionsFromDatabase(session, data, ctx, userId)
            })

            await driver.destroy()
            driver = undefined
            return REPLY
        }
        else {

            if(typeof text !== 'string') throw 'Нераспознаваемый ввод.'

            if(['/version', '/help', '/start'].includes(text)) return await simpleReplies(text, ctx)

            driver = await getDriver()

            await driver.tableClient.withSession(async (session) => {
                await textFromDatabase(session, text, ctx, userId)
            })

        }
    }
    catch(err){
        await ctx.reply(`🤔 ${err}`)
    }
    finally {
        if(driver) await driver.destroy()
    }
    return REPLY
}*/


/*
export const textFromDatabase = async (session: YDB.TableSession, text: string, ctx: Context, userId: number | string) => {

    if(text.startsWith('/remove')){
        const [ _, code] = text.split(/\s+/)
        if(!code) return await ctx.reply(`🤔 Не удалось распознать код для удаления.`)
        await session.executeQuery(`delete from codes where code = '${code}' where order_id is null`)
        const codes = await getCodes(session)
        ctx.reply(codes, {parse_mode: 'HTML'})
        return
    }
    
    switch(text) {

        case '/codes':
            ctx.reply(await getCodes(session), {parse_mode: 'HTML'})
            return

        case '/check':
            await findUnfulfilled(session, ctx)
            return

        case '/deliver':
        case '/delivery':
            const ids = await getUnclosed(session)
            if(ids.length) await ctx.reply('Отправить незаполненные заказы?', {parse_mode: 'HTML', ...Markup.inlineKeyboard([
                [
                    Markup.button.callback('📤 отравить', `deliver`),
                    Markup.button.callback('🛑 не отравлять', `cancel`),
                ]
            ])})
            else await ctx.reply(`🤔 Неотправленных заказов пока нет.`)
            return
    }

    const offers = await stringsFromQuery(session, `select id from offers`)

    let codes = text.trim()
        .split(/[\r\n]+/)
        .map(row => row.split(/\s+/))
    
    let { length } = codes

    codes = codes.filter(arr => arr.length === 2 &&  offers.includes(arr[0]))

    if(!codes.length) throw `Не удалось распознать коды в тексте: ${text}.`

    let success = 0
                
    for(const [offer, code] of codes) {
        if(!isEmpty(await session.executeQuery(`select code from codes where code = '${code}'`))) continue
        await session.executeQuery(`insert into codes (offer_id, code, created_at, user) values ('${offer}', '${code}', ${getYDBTimestamp()}, ${userId})`)
        success++
    }

    if(!success) throw 'Не удалось добавить ни одного кода. Возможно, они уже занесены в базу данных.'

    let message = success === length ? `📑 Все строки успешно обработаны.` : `📑 Успешно обработано ${success} строк из ${length}.`
    
    const ids = await getUnclosed(session)
    
    if(!ids.length) return await ctx.reply(message)
    
    message += `\n\n${unsufficientOrders}`

    await ctx.reply(message, orderButtons(ids))
}
*/
