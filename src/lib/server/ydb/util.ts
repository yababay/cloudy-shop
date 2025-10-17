import  YDB from 'ydb-sdk'

export const stringsFromQuery = async (session: YDB.TableSession, query: string): Promise<string[]> => {
    const result = await session.executeQuery(query)
    return stringsFromResult(result)
}

export const stringFromQuery = async (session: YDB.TableSession, query: string): Promise<string> => {
    const result = await session.executeQuery(query)
    return stringFromResult(result)
}

export const stringsFromResult = (result: YDB.Ydb.Table.ExecuteQueryResult): string[] => {
    const rows = rowsFromResult(result)
    const values = stringFromRows(rows, true)
    if(Array.isArray(values)) return values
    throw 'only arrays here'
}

export const stringFromResult = (result: YDB.Ydb.Table.ExecuteQueryResult): string => {
    const rows = rowsFromResult(result)
    const value = stringFromRows(rows, false)
    if(Array.isArray(value)) throw 'no string arrays here'
    return value
}

export const intsFromQuery = async (session: YDB.TableSession, query: string): Promise<number[]> => {
    const result = await session.executeQuery(query)
    return intsFromResult(result)
}

export const intFromQuery = async (session: YDB.TableSession, query: string): Promise<number> => {
    const result = await session.executeQuery(query)
    return intFromResult(result)
}

export const intsFromResult = (result: YDB.Ydb.Table.ExecuteQueryResult): number[] => {
    const rows = rowsFromResult(result)
    const values = intFromRows(rows, true)
    if(Array.isArray(values)) return values
    throw 'only arrays here'
}

export const intFromResult = (result: YDB.Ydb.Table.ExecuteQueryResult): number => {
    const rows = rowsFromResult(result)
    const value = intFromRows(rows, false)
    if(Array.isArray(value)) throw 'no int arrays here'
    return value
}

export const rowsFromResult = (result: YDB.Ydb.Table.ExecuteQueryResult) => {
    const { resultSets } = result
    const [ resultSet ]  = resultSets
    const { rows } = resultSet
    if(!Array.isArray(rows)) throw 'bad rows'
    return rows
}

export const intFromItem = (item: YDB.Ydb.IValue): number => {
    const { int64Value, int32Value, uint64Value, uint32Value } = item
    const toInt = (v: number | Long | null | undefined | string) => {
        if(typeof v === 'number' || (v && typeof v === 'object') || (v && typeof v === 'string')) return +v
        return NaN
    }
    let n = toInt(int64Value)
    if(!isNaN(n)) return n
    n = toInt(int32Value)
    if(!isNaN(n)) return n
    n = toInt(uint64Value)
    if(!isNaN(n)) return n
    n = toInt(uint32Value)
    if(!isNaN(n)) return n
    throw `no number value: ${JSON.stringify(item)} (value = ${n})`
}

export const stringFromItem = (item: YDB.Ydb.IValue): string => {
    if(!item) throw 'no string item'
    const { textValue } = item
    if(!textValue) throw 'no textValue'
    return textValue
}

export const intFromRows = (rows: YDB.Ydb.IValue[], forceArray = false): number | number[] => {
  const values = rows.map(({ items }) => {
    if(!items) throw 'no items'
    return intFromItem(items[0])
  })
  const [ value ] = values
  return values.length > 1 || forceArray ? values : value
}

export const stringFromRows = (rows: YDB.Ydb.IValue[], forceArray = false): string | string[] => {
  const values = rows.map(({ items }) => {
    if(!items) throw 'no items'
    return stringFromItem(items[0])
  })
  const [ value ] = values
  return values.length > 1 || forceArray ? values : value
}

export const dateFromItem = (item: YDB.Ydb.IValue) => {
    if(!item) throw 'no date item'
    const { uint32Value } = item
    if(!uint32Value) throw 'no uint item'
    return new Date(+uint32Value * 1000)
}

export const isEmpty = (result: YDB.Ydb.Table.ExecuteQueryResult): boolean => {
    const { resultSets } = result
    const [ resultSet ]  = resultSets
    const { rows } = resultSet
    if(!rows) throw 'bad rows'
    return !rows.length
  }
  
export const getYDBTimestamp = (date: Date = new Date()) => `Datetime("${date.toISOString().slice(0, -5)}Z")`
