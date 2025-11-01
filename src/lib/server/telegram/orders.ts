import type { QueryClient } from '@ydbjs/query'
import { Markup, type Context } from 'telegraf'
import { deliverAll, deliverOrder, FAKE_CODE, getSumAndCount, prepareInstructions } from '../delivery.js'

export const parseActions = async (sql: QueryClient, data: string, ctx: Context) => {
    switch(data){
        
        case 'deliver':
            await deliverAll(sql, 0, ctx)
            return true

        case 'cancel':
            await ctx.reply('Отправка отменена.')
            return true

        default:
            if(!/^\d+$/.test(data)) return false
            await showSingle(sql, +data, ctx)
    }
    return true
}

export const parseCommands = async (sql: QueryClient, text: string, ctx: Context) => {

    switch(text) {

        case '/check':
            const oids = await findUnfulfilled(sql)
            if(!oids.length) await ctx.reply(`🤔 Неотправленных заказов не обнаружено`)
            else if(oids.length === 1){
                const [ oid ] = oids
                await showSingle(sql, oid, ctx)
                return true
            }
            else await ctx.reply(`Неотправленные заказы:`, Markup.inlineKeyboard(
                oids.map(oid => [Markup.button.callback(`№ ${Number(oid)}`, `${oid}`)])
            ))
            return true
                
        case '/deliver':
        case '/delivery':
            const _oids = await findUnfulfilled(sql)
            if(_oids.length) await ctx.reply('Отправить незаполненные заказы?', {parse_mode: 'HTML', ...Markup.inlineKeyboard([
                [
                    Markup.button.callback('📤 отравить', `deliver`),
                    Markup.button.callback('🛑 не отравлять', `cancel`),
                ]
            ])})
            else await ctx.reply(`🤔 Неотправленных заказов пока нет.`)
            return true
    }

    return false
}

const showSingle = async (sql: QueryClient, oid: number, ctx: Context) => {
    const { sum, count, goods } = await getSumAndCount(sql)
    if(sum === count){
        const instructions = await prepareInstructions(sql)
        await deliverOrder(sql, { orderId: BigInt(oid), goods}, instructions, ctx)
        return
    }
    let message = `В заказе № ${Number(oid)} заполнено ${count} кодов из ${sum}:\n\n`
    message += Array.from(goods.entries()).map(([offer, codes]) => {
        const { length } = codes
        const count = codes.filter(el => el.indexOf(FAKE_CODE) > -1).length
        return `<code>${offer}</code>: ${count} из ${length}`
    }).join('\n\n')
    await ctx.reply(message)
}

const findUnfulfilled = async (sql: QueryClient) => {
    const [ rows ] = await sql`select distinct order_id from ordered_items where fulfilled_at is null and delivered_at is null order by order_id`
    return rows.map(row => {
        const { order_id } = row as { order_id: bigint }
        return Number(order_id)
    })
}
