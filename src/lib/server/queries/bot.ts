import  YDB from 'ydb-sdk'
import { deliverOrder, getItemsAndCodes, prepareInstructions } from './delivery.js'
import { Markup, type Context } from 'telegraf'
import { intsFromQuery, rowsFromResult, stringFromItem } from '../ydb/util.js'
import { getSumAndCount, restoreItems } from './fulfill.js'

export const lackOfCodes = async (session: YDB.TableSession, orderId: string | number, ctx: Context) => {

    const { count, sum } = await getSumAndCount(session, orderId)
    if(count === sum) {
        const instructions = await prepareInstructions(session)
        await deliverOrder(session, orderId, instructions, ctx)
        return
    }
    
    const {codes, items} = await getItemsAndCodes(session, orderId)

    const offers = items
        .map(({offerId, count}) => {
            const arr = codes.get(offerId) || []
            return [ offerId, count, count - arr.length ]
        })
        .filter(([ _, __, lack ]) => +lack > 0)
        .map(([offer, amount, lack]) => `<code>${offer}</code> (${lack}/${amount})`)

    const message = `В заказе № ${orderId} не заполнены коды для ${offers.length === 1 ? 'товара' : 'товаров:'} ${offers.join(', ')}.`
    await ctx.reply(message, {parse_mode: 'HTML'})
}

export const getFulfillness = async (session: YDB.TableSession, orderId: number): Promise<{ sum: number, count: number}> => {
    const sumQuery = `select sum(amount) from ordered_items where order_id = ${orderId}`
    const countQuery = `select count(*) from codes where order_id = ${orderId}`
    const both = await session.executeQuery(sumQuery + ';' + countQuery)
    const { resultSets } = both
    const rows = resultSets.map(rs => {
        const { rows } = rs
        if(!rows) throw 'no rows in getFulfillness'
        const [ row ] = rows
        const { items } = row
        if(!items) throw 'no items in getFulfillness'
        const [ item ] = items
        const { uint64Value, int64Value } = item
        const value = uint64Value || int64Value
        if(!(value && typeof value === 'object')) throw 'no int64 in getFulfillness'
        return  +value
    })
    const [ sum, count ] = rows
    return { sum, count }
}

export const getUnclosed = async (session: YDB.TableSession, ff = false): Promise<number[]> => {
    return await intsFromQuery(session, "select distinct order_id from ordered_items where fulfilled_at is null and  delivered_at is null")
}

export const orderButtons = (ids: number[]) => Markup.inlineKeyboard([ids.map(id => [`№ ${id}`, `uf_${id}`]).map(([title, num]) => Markup.button.callback(title, num))])

export const unsufficientOrders = `⏱️ Недостаточно кодов для заказов:`

export const findUnfulfilled = async (session: YDB.TableSession, ctx: Context) => {
    let ids = await getUnclosed(session)
    if(!ids.length) { 
        await ctx.reply('🎉 Незаполненных заказов не обнаружено.')
        return
    }
    if(ids.length === 1){
        const [ id ] = ids
        await lackOfCodes(session, id, ctx)
        return
    }
    else await ctx.reply(unsufficientOrders, orderButtons(ids))
}
                                
export const getCodes = async (session: YDB.TableSession) => {
    const result = await session.executeQuery(`select code, offer_id, created_at from codes where order_id is null order by created_at desc limit 50`)
    const rows = rowsFromResult(result)
        .map(({items}) => {
            if(!items) throw 'no items in getCodes'
            const [ idItem, codeItem, tsItem ] = items
            return `✅ ${stringFromItem(codeItem)} <code>${stringFromItem(idItem)}</code>`
        })
    if(!rows.length) return `🤔 Пока коды не добавлены…`
    return rows.join('\n\n')
}
