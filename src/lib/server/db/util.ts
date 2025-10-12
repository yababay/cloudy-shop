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
    const rows = rowsFromResultSets(result)
    const values = stringFromRows(rows, true)
    if(Array.isArray(values)) return values
    throw 'only arrays here'
}

export const stringFromResult = (result: YDB.Ydb.Table.ExecuteQueryResult): string => {
    const rows = rowsFromResultSets(result)
    const value = stringFromRows(rows, false)
    if(Array.isArray(value)) throw 'no arrays here'
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
    const rows = rowsFromResultSets(result)
    const values = intFromRows(rows, true)
    if(Array.isArray(values)) return values
    throw 'only arrays here'
}

export const intFromResult = (result: YDB.Ydb.Table.ExecuteQueryResult): number => {
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

export const isEmpty = (result: YDB.Ydb.Table.ExecuteQueryResult): boolean => {
    const { resultSets } = result
    const [ resultSet ]  = resultSets
    const { rows } = resultSet
    return !rows.length
  }
  
export const getYDBTimestamp = (date: Date = new Date()) => `Datetime("${date.toISOString().slice(0, -5)}Z")`

export const prepareInstruction = async (session: YDB.TableSession, chatUrl = '') => {

    const result = await session.executeQuery(`select key, value from settings`)

    const settings = new Map<string, string>(rowsFromResultSets(result).map(({items}) => {
        const [ key, value ] = items
        return [ stringFromItem(key), stringFromItem(value)  ]
    }))

    const OPENING_HOURS_FROM = settings.get('OPENING_HOURS_FROM')
    const OPENING_HOURS_TO = settings.get('OPENING_HOURS_TO')
    const ACTIVATION_INSTRUCTION = settings.get('ACTIVATION_INSTRUCTION')
    const HOLIDAY_INSTRUCTION = settings.get('HOLIDAY_INSTRUCTION') 
    const CHAT_FIRST_MESSAGE = settings.get('CHAT_FIRST_MESSAGE')
    const FAKE_CODE = settings.get('FAKE_CODE')

    return [ACTIVATION_INSTRUCTION, HOLIDAY_INSTRUCTION, CHAT_FIRST_MESSAGE, FAKE_CODE].map(instr => instr
        .replaceAll('OPENING_HOURS_FROM', OPENING_HOURS_FROM)
        .replaceAll('OPENING_HOURS_TO', OPENING_HOURS_TO)
        .replaceAll('CHAT_URL', chatUrl))
}
  