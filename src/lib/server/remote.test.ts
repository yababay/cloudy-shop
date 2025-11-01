import { Driver } from '@ydbjs/core'
import { query } from '@ydbjs/query'
import { Uint64 } from '@ydbjs/value/primitive'
import { expect, describe, it, beforeAll, afterAll } from 'vitest'
import { getRemoteDriver } from './ydb/index.js'
import { createTables, getOffers, insertTestingData } from './delivery.js'

let driver: Driver | undefined = undefined

describe('Offers', async () => {

  it('should be fulfilled', async () => {
    if(!driver) throw 'no driver'
    const sql = query(driver)
    const offers = getOffers().map(id => ({id}))
    await sql`insert into offers select * from as_table(${offers})`
    const [ rows ] = await sql`select * from offers where id = 'APPLE500'`
    expect(rows.length).toBe(1)
  })

  beforeAll(async () => {
    driver = await getRemoteDriver()
    const sql = query(driver)
    await sql`      
        DROP TABLE IF EXISTS offers;
        CREATE TABLE IF NOT EXISTS offers (
            id Text,
            name Text,
            description Text,
            price Double,
            primary key(id)
      );
    `
  })

  afterAll(() => {if(driver) driver.close()})
})

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
