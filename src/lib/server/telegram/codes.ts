import { Datetime, Uint64 } from '@ydbjs/value/primitive'
import type { QueryClient } from '@ydbjs/query'
import type { Context } from 'telegraf'
import { delay } from '$lib/util/date.js'

export const parseCodes = async (sql: QueryClient, text: string, uid: number, ctx: Context) => {

    if(text.startsWith('/remove')){
        const [ _, code] = text.split(/\s+/)
        if(!code) return await ctx.reply(`🤔 Не удалось распознать код для удаления.`)
        await sql`delete from codes where code = ${code} and order_id is null`
        const codes = await getCodes(sql)
        await ctx.reply(codes, {parse_mode: 'HTML'})
        return true
    }

    if(text === '/codes') {
        const codes = await getCodes(sql)
        await ctx.reply(codes.length ? codes : '🤔 Свободные коды не обнаружены.', {parse_mode: 'HTML'})
        return true
    }

    let codes = text.trim()
        .split(/[\r\n]+/)
        .map(row => row.split(/\s+/))
    
    let { length } = codes

    const [ rows ] = await sql`select id from offers`
    const offers = rows.map(row => {
        const { id } = row as { id: string }
        return id
    }) 
    
    codes = codes.filter(([ offer, code ]) => offers.includes(offer) && code)
    
    if(!codes.length) return false

    let success = 0

    for(const [offer, code] of codes) {
        await delay()
        const [ rows ] = await sql`select code from codes where code = ${code}`
        if(rows.length) continue
        await sql`insert into codes (offer_id, code, created_at, user) values (${offer}, ${code}, ${new Datetime(new Date)}, ${new Uint64(BigInt(uid))})`
        success++
    }

    let message = success === length ? `📑 Все строки успешно обработаны.` : `📑 Успешно обработано ${success} строк из ${length}.`
    await ctx.reply(message)

    return true
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

