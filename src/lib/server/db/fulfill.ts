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
    const sum = await intFromQuery(session, `select sum(amount) from ordered_items where order_id = ${orderId}`)
    const count = await intFromQuery(session, `select count(*) from codes where order_id = ${orderId}`)
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