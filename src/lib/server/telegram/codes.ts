import { Datetime, Uint64 } from '@ydbjs/value/primitive'
import type { QueryClient } from '@ydbjs/query'
import type { Context } from 'telegraf'

export const parseCodes = async (sql: QueryClient, text: string, uid: number, ctx: Context) => {

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
        const [ rows ] = await sql`select code from codes where code = '${code}'`
        if(rows.length) continue
        await sql`insert into codes (offer_id, code, created_at, user) values ('${offer}', '${code}', ${new Datetime(new Date)}, ${new Uint64(BigInt(uid))})`
        success++
    }

    let message = success === length ? `📑 Все строки успешно обработаны.` : `📑 Успешно обработано ${success} строк из ${length}.`

    return true
}
