import { Driver } from '@ydbjs/core'
import { query } from '@ydbjs/query'
import { Uint64 } from '@ydbjs/value/primitive'
import { expect, describe, it, beforeAll, afterAll } from 'vitest'
import { getRemoteDriver } from './ydb/index.js'
import { createTables, insertTestingData } from './delivery.js'

let driver: Driver | undefined = undefined

describe.skip('Remote DB', async () => {

  it('should be set up', async () => {
    if(!driver) throw 'no driver'
    const sql = query(driver)
    const [ [ row ] ] = await sql`select count(*) as count from codes`
    const { count } = row as { count: Uint64 }
    console.log(count)
    expect(Number(count)).toBe(11)
  })

  beforeAll(async () => {
    driver = await getRemoteDriver()
    const sql = query(driver)
    await createTables(sql)
    await insertTestingData(sql)
  })

  afterAll(() => {if(driver) driver.close()})
})
