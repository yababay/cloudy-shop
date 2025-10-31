import type { Driver } from '@ydbjs/core'
import { query } from '@ydbjs/query'
import type { YC } from '../../yc.js'
import { getRemoteDriver } from '../ydb/driver.js'
import { plainTextOutput } from './help.js'
import { parsePayload, REPLY } from './util.js'
import { parseCodes } from './codes.js'
import { parseActions, parseCommands } from './orders.js'

const HZ = '🤔'

export const telegram = async (event: YC.CloudFunctionsHttpEvent, context: YC.CloudFunctionsHttpContext) => {
    
    const { ctx, text, data, uid } = parsePayload(context)
    if(text && await plainTextOutput(text, ctx)) return REPLY

    let driver: Driver | undefined = undefined

    try {
        driver = await getRemoteDriver()
        const sql = query(driver)
        if(text && await parseCodes(sql, text, uid, ctx)) return REPLY
        if(text && await parseCommands(sql, text, ctx)) return REPLY
        if(data && await parseActions(sql, data, ctx)) return REPLY
    }
    catch(err){
        await ctx.reply(`${HZ} ${err}`)
    }
    finally {
        if(driver) driver.close()
    }

    await ctx.reply(`${HZ} Ваше сообщение не распознано.`)
    return REPLY
}
