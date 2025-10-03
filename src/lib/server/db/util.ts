import  YDB from 'ydb-sdk'
import { Order } from '../../types/index.js'

export const getYDBTimestamp = (date: Date = new Date()) => `Datetime("${date.toISOString().slice(0, -5)}Z")`

export const intFromResultSets = (result: YDB.Ydb.Table.ExecuteQueryResult): number | number[] => {
    const { resultSets } = result
    const [ resultSet ]  = resultSets
    const { rows } = resultSet
    if(!Array.isArray(rows)) throw 'bad rows'
    const [ row ] = rows
    const { items } = row
    if(!Array.isArray(items)) throw 'bad items'
    const values = items.map(({ int32Value, int64Value }) => +(int32Value || int64Value))
    const [ value ] = values
    return values.length > 1 ? values : value
}

export const isEmpty = (result: YDB.Ydb.Table.ExecuteQueryResult): boolean => {
  const { resultSets } = result
  const [ resultSet ]  = resultSets
  const { rows } = resultSet
  return !rows.length
}

export const stringFromResultSets = (result: YDB.Ydb.Table.ExecuteQueryResult): string | string[] => {
  const { resultSets } = result
  const [ resultSet ]  = resultSets
  const { rows } = resultSet
  if(!Array.isArray(rows)) throw 'bad rows'
  const [ row ] = rows
  const { items } = row
  if(!Array.isArray(items)) throw 'bad items'
  const values = items.map(({ textValue }) => textValue)
  const [ value ] = values
  return values.length > 1 ? values : value
}

export const checkFulfillness = async (session: YDB.TableSession, order: Order) => {

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

  /*
  const count = await new Promise<string>((yep) => setTimeout(() => yep(`select count(*) from codes where order_id = ${id}`), 500))
      .then(query => session.executeQuery(query))
      .then(result => intFromResultSets(result))
  {

    result = await session.executeQuery(`select count(*) from codes where order_id = ${id}`)
    const count = intFromResultSets(result)
    console.log('count =', count, 'item =', JSON.stringify(result))
  })*/

  if(Array.isArray(sum) || Array.isArray(count)) throw 'no arrays here'

  return [sum, count]
}
