import  YDB from 'ydb-sdk'
import { Item } from '../../types/index.js'
import { isEmpty, getYDBTimestamp, rowsFromResultSets, intFromItem, stringFromItem, intFromQuery, intsFromQuery, stringFromRows } from './util.js'

export const lackOfCodes = async (session: YDB.TableSession, orderId: string | number) => {

    const result = await session.executeQuery(`select offer_id, amount from ordered_items where order_id = ${orderId}`)
    const rows = rowsFromResultSets(result)
    let offers = rows.map(({items}) => {
        const [offer, amount] = items
        return [stringFromItem(offer), intFromItem(amount)]
    })

    const counts = new Map<string, number>()
    for(const [offer, count] of offers){
        const item = { count: +count, offerId: offer + '' }
        await fulfillItem(session, item, +orderId)
        const result = await session.executeQuery(`select code from codes where order_id = ${orderId} and offer_id = '${offer}'`)
        const rows = rowsFromResultSets(result)
        const { length } = rows
        console.log('length', offer, length)
        counts.set(offer + '', length)
    }

    offers.forEach(offer => {
        const [ oid, cnt ] = offer
        const offerId = oid + ''
        const amount = +cnt 
        const count = counts.get(offerId)
        const lack = amount - count
        offer.push(lack)
    })

    offers = offers.filter(([_, __, lack]) => +lack > 0)

    if(!offers.length) return `🎉 Заказ № ${orderId} обеспечен кодами полностью.`

    return `В заказе № ${orderId} не заполнены коды для товаров: ${offers.map(([offer, amount, lack]) => `<code>${offer}</code> (${lack}/${amount})`).join(', ')}.`
}

export const fulfillItem = async (session: YDB.TableSession, item: Pick<Item, 'count' | 'offerId'>, orderId: number) => {

    const { count, offerId } = item
    
    let amount = await intFromQuery(session, `select count(*) from codes where offer_id = '${offerId}' and  order_id = ${orderId}`)

    let lack =  count - amount
    if(lack === 0) return count

    const offers = new Array<string>(lack).fill(offerId)
    const ts = getYDBTimestamp()

    for(const offer of offers) {
        const result = await session.executeQuery(`select code from codes where offer_id = '${offer}' and order_id is null limit 1`)
        if(isEmpty(result)){
            return amount
        }
        const rows = rowsFromResultSets(result)
        let code = stringFromRows(rows) 
        await session.executeQuery(`update codes set order_id = ${orderId}, updated_at = ${ts} where code = '${code}'`)
        amount++
    }
    return amount
}

export const getCodes = async (session: YDB.TableSession) => {
    const result = await session.executeQuery(`select code, offer_id, created_at from codes where order_id is null order by created_at desc limit 50`)
    return rowsFromResultSets(result)
        .map(({items}) => {
            const [ idItem, codeItem, tsItem ] = items
            return `✅ ${stringFromItem(codeItem)} <code>${stringFromItem(idItem)}</code>`
        })
}

export const getFulfillness = async (session: YDB.TableSession, orderId: number): Promise<{ sum: number, count: number}> => {
    const sumQuery = `select sum(amount) from ordered_items where order_id = ${orderId}`
    const countQuery = `select count(*) from codes where order_id = ${orderId}`
    const both = await session.executeQuery(sumQuery + ';' + countQuery)
    const { resultSets } = both
    const rows = resultSets.map(rs => {
        const { rows } = rs
        const [ row ] = rows
        const { items } = row
        const [ item ] = items
        const { uint64Value, int64Value } = item
        const value = uint64Value || int64Value
        if(typeof value === 'number') throw 'no number here'
        const { low } = value
        return  low
    })
    const [ sum, count ] = rows
    //console.log('both', rows)
    //const sum = await intFromQuery(session, sumQuery)
    //const count = await intFromQuery(session, countQuery)
    return { sum, count }
}

export const getUnclosed = async (session: YDB.TableSession, ff = false): Promise<number[]> => {
    const unclosed = await intsFromQuery(session, "select distinct order_id from ordered_items where fulfilled_at is null")
    const fulfilled = new Array<number>()
    for(const id of unclosed){
        const { sum, count } = await getFulfillness(session, id)
        if(count === sum) fulfilled.push(id)
    }
    return ff ? fulfilled : unclosed.filter(id => !fulfilled.includes(id))
}

export const restoreItems = async (session: YDB.TableSession, orderId: number | string): Promise<Item[]> => {
    const result = await session.executeQuery(`select item_id, offer_id, amount from ordered_items where order_id = ${orderId}`) 
    const rows = rowsFromResultSets(result)
    return rows.map(({items}) => {
        const [idItem, offerItem, countItem] = items
        const id = intFromItem(idItem)
        const offerId = stringFromItem(offerItem)
        const count = intFromItem(countItem)
        return { id, offerId, count }
    })
}
