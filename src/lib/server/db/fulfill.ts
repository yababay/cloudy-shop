import  YDB from 'ydb-sdk'
import { Item, Order } from '../../types/index.js'
import { isEmpty, getYDBTimestamp, rowsFromResultSets, intFromItem, stringFromItem, intFromQuery, intsFromQuery } from './util.js'

export const getCodes = async (session: YDB.TableSession) => {
    const result = await session.executeQuery(`select code, offer_id, created_at from codes where order_id is null order by created_at desc limit 50`)
    return rowsFromResultSets(result)
        .map(({items}) => {
            const [ idItem, codeItem, tsItem ] = items
            return `✅ ${stringFromItem(codeItem)} <code>${stringFromItem(idItem)}</code>`
        })
}

export const getFulfillness = async (session: YDB.TableSession, orderId: number): Promise<{ sum: number, count: number}> => {
    const sum = await intFromQuery(session, `select sum(amount) from ordered_items where order_id = ${orderId}`)
    const count = await intFromQuery(session, `select sum(amount) from ordered_items where order_id = ${orderId}`)
    return { sum, count }
}

export const getUnfilled = async (session: YDB.TableSession): Promise<number[]> => {
    const unclosed = await intsFromQuery(session, "select distinct order_id from ordered_items where fulfilled_at is null")
    const unfilled = new Array<number>()
    for(const id of unclosed){
        const { sum, count } = await getFulfillness(session, id)
        if(count < sum) unfilled.push(id)
    }
    return unfilled
}

export const restoreItems = async (session: YDB.TableSession, orderId: number): Promise<Item[]> => {
    const result = await session.executeQuery(`select id, offer, count from ordered_items where order_id = ${orderId}`) 
    const rows = rowsFromResultSets(result)
    return rows.map(({items}) => {
        const [idItem, offerItem, countItem] = items
        const id = intFromItem(idItem)
        const offerId = stringFromItem(offerItem)
        const count = intFromItem(countItem)
        return { id, offerId, count }
    })
}

/*
export const fulfillItem = async (session: YDB.TableSession, id: number) => {
    const result = await session.executeQuery(`select count from ordered_items` )
}

export const fulfillOrder = async (session: YDB.TableSession, order: Order) => {

  const { items, id } = order
  let result = await session.executeQuery(`select sum(amount) from ordered_items where order_id = ${id}`)
  const sum = intFromResultSets(result)
 
  const offers = items.reduce((acc, { offerId, count }) => {
    const arr = new Array<string>(count).fill(offerId)
    return [ ...acc, ...arr ]
  }, new Array<string>())
  
  const ts = getYDBTimestamp()
  const failed = new Set<string>()

  let count = 0

  for(const offer of offers) {
      if(failed.has(offer)) continue
      result = await session.executeQuery(`select code from codes where offer_id = '${offer}' and order_id is null limit 1`)
      if(isEmpty(result)){
        failed.add(offer)
        continue
      }
      count++
      let code = stringFromResultSets(result) 
      if(Array.isArray(code))  throw 'no arrays here'
      console.log('code =', code, 'count =', count)
      await session.executeQuery(`update codes set order_id = ${id}, updated_at = ${ts} where code = '${code}'`)
  }

  if(Array.isArray(sum) || Array.isArray(count)) throw 'no arrays here'

  return [sum, count]
}
*/