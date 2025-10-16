import  YDB from 'ydb-sdk'
import { dateFromItem, intFromItem, isEmpty, rowsFromResult, stringFromItem } from '../ydb/util.js'
import type { Item } from '$lib/types/index.js'

export const getFulfillness = async (session: YDB.TableSession, orderId: number): Promise<{ sum: number, count: number}> => {
    const sumQuery = `select sum(amount) from ordered_items where order_id = ${orderId}`
    const countQuery = `select count(*) from codes where order_id = ${orderId}`
    const both = await session.executeQuery(sumQuery + ';' + countQuery)
    const { resultSets } = both
    const rows = resultSets.map(rs => {
        const { rows } = rs
        if(!rows) throw 'no rows to fulfill'
        const [ row ] = rows
        const { items } = row
        if(!items) throw 'no items to fulfill'
        const [ item ] = items
        const { uint64Value, int64Value } = item
        const value = uint64Value || int64Value
        if(typeof value === 'number' || !value) throw 'no number here'
        return  +value
    })
    const [ sum, count ] = rows
    return { sum, count }
}

export const getUnfilled = async (session: YDB.TableSession): Promise<Array<{id: number, ts: Date}>> => {
    const result = await session.executeQuery('select distinct order_id, created_at from ordered_items where fulfilled_at is null')
    if(isEmpty(result)) return []
    const rows = rowsFromResult(result).map(({items}) => {
        if(!items) throw 'no items in unfulfilled'
        const [ idItem, tsItem ] = items
        if(!(idItem && tsItem)) throw 'bad items'
        return { id: intFromItem(idItem), ts: dateFromItem(tsItem) }
    })
    return rows
}

export const restoreItems = async (session: YDB.TableSession, orderId: number | string): Promise<Item[]> => {
    const result = await session.executeQuery(`select item_id, offer_id, amount from ordered_items where order_id = ${orderId} order by offer_id`) 
    const rows = rowsFromResult(result)
    return rows.map(({items}) => {
        if(!items) throw 'no items to restore'
        const [idItem, offerItem, countItem] = items
        const id = intFromItem(idItem)
        const offerId = stringFromItem(offerItem)
        const count = intFromItem(countItem)
        return { id, offerId, count }
    })
}