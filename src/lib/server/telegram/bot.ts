import type { YC } from '../../yc.js'
import { playnTextOutput } from './text.js'
import { parsePayload, REPLY } from './util.js'

const HZ = '🤔'

export const telegram = async (event: YC.CloudFunctionsHttpEvent, context: YC.CloudFunctionsHttpContext) => {
    
    const { ctx, text, data, uid } = parsePayload(context)
    if(text && await playnTextOutput(text, ctx)) return REPLY

    else await ctx.reply(`${HZ} Ваше сообщение не распознано.`)
    return REPLY
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
