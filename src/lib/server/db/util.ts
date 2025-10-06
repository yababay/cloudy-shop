import  YDB from 'ydb-sdk'

export const stringsFromQuery = async (session: YDB.TableSession, query: string): Promise<string[]> => {
    const result = await session.executeQuery(query)
    const rows = rowsFromResultSets(result)
    const values = stringFromRows(rows, true)
    if(Array.isArray(values)) return values
    throw 'only arrays here'
}

export const stringFromQuery = async (session: YDB.TableSession, query: string): Promise<string> => {
    const result = await session.executeQuery(query)
    const rows = rowsFromResultSets(result)
    const value = stringFromRows(rows, false)
    if(Array.isArray(value)) throw 'no arrays here'
    return value
}

export const intsFromQuery = async (session: YDB.TableSession, query: string): Promise<number[]> => {
    const result = await session.executeQuery(query)
    const rows = rowsFromResultSets(result)
    const values = intFromRows(rows, true)
    if(Array.isArray(values)) return values
    throw 'only arrays here'
}

export const intFromQuery = async (session: YDB.TableSession, query: string): Promise<number> => {
    const result = await session.executeQuery(query)
    const rows = rowsFromResultSets(result)
    const value = intFromRows(rows, false)
    if(Array.isArray(value)) throw 'no arrays here'
    return value
}

export const rowsFromResultSets = (result: YDB.Ydb.Table.ExecuteQueryResult) => {
    const { resultSets } = result
    const [ resultSet ]  = resultSets
    const { rows } = resultSet
    if(!Array.isArray(rows)) throw 'bad rows'
    return rows
}

export const intFromItem = (item: YDB.Ydb.IValue): number => {
    const { int32Value, int64Value } = item
    return +(int32Value || int64Value)
}

export const stringFromItem = (item: YDB.Ydb.IValue): string => {
    const { textValue } = item
    return textValue
}

export const isEmpty = (result: YDB.Ydb.Table.ExecuteQueryResult): boolean => {
  const { resultSets } = result
  const [ resultSet ]  = resultSets
  const { rows } = resultSet
  return !rows.length
}

export const getYDBTimestamp = (date: Date = new Date()) => `Datetime("${date.toISOString().slice(0, -5)}Z")`

export const intFromRows = (rows: YDB.Ydb.IValue[], forceArray = false): number | number[] => {
  const values = rows.map(({ items }) => intFromItem(items[0]))
  const [ value ] = values
  return values.length > 1 || forceArray ? values : value
}

export const stringFromRows = (rows: YDB.Ydb.IValue[], forceArray = false): string | string[] => {
  const values = rows.map(({ items }) => stringFromItem(items[0]))
  const [ value ] = values
  return values.length > 1 || forceArray ? values : value
}
