import type { Driver } from 'ydb-sdk';
import { getDriver } from '../ydb/driver4vitest.js';
import { getFulfillness, getUnfilled, restoreItems, tryToFulfill } from './fulfill.js';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { createTables } from './models.js';
import type { Item } from '$lib/types/index.js';
import { intFromQuery } from '../ydb/util.js';

const ORDER_ID = 49803606592

let driver: Driver

describe.skip('Fulfill order', () => {

  let orders: number[]
  let items: Item[]

  it('should be 1 order', async () => {

    orders = (await driver.tableClient.withSession(async (session) => {
        return await getUnfilled(session)
    })).map(({id}) => id)

    expect(orders.length).toBe(1)
    const [ orderId ] = orders
    expect(orderId).toBe(ORDER_ID)

  })

  it('should be 2 items', async () => {

    items = await driver.tableClient.withSession(async (session) => {
      return await restoreItems(session, orders[0])
    })

    expect(items.length).toBe(2)
  });

  it('should be not fulfilled', async () => {

    const { sum, count } = await driver.tableClient.withSession(async (session) => {
      return await getFulfillness(session, orders[0])
    })

    expect(sum).toBe(4)
    expect(count).toBe(0)
  });

  it('should have free codes', async () => {

    const apple500 = await driver.tableClient.withSession(async (session) => {
      return await intFromQuery(session, `select count(*) from codes where offer_id = 'APPLE500'`)
    })

    const apple5050 = await driver.tableClient.withSession(async (session) => {
      return await intFromQuery(session, `select count(*) from codes where offer_id = 'APPLE5050'`)
    })

    expect(apple500).toBe(5)
    expect(apple5050).toBe(6)
  });

  it('should be fulfilled', async () => {

    const { codes } = await driver.tableClient.withSession(async (session) => {
        return await tryToFulfill(session, orders[0])
    })

    const rest = await driver.tableClient.withSession(async (session) => {
      return await intFromQuery(session, `select count(*) from codes where order_id is null`)
    })

    const { sum, count } = await driver.tableClient.withSession(async (session) => {
      return await getFulfillness(session, orders[0])
    })

    const codes500 = codes.get('APPLE500')
    const codes5050 = codes.get('APPLE5050')

    expect(codes500?.length).toBe(1)
    expect(codes5050?.length).toBe(3)
    expect(rest).toBe(7)
    expect(sum).toBe(4)
    expect(sum).toBe(count)
  });

  beforeAll(async () => {
    driver = await getDriver()
    await driver.tableClient.withSession(async (session) => {
        await createTables(session)
        await session.executeQuery(`
          insert into ordered_items (item_id, order_id, campaign_id, offer_id, amount, created_at) values 
            (968316434,	49803606592,	110987348, 'APPLE500',	  1,	Datetime('2025-10-14T14:40:09Z')),
            (968316435,	49803606592,	110987348, 'APPLE5050',	3,	Datetime('2025-10-14T14:40:09Z'))
        `)
        await session.executeQuery(`
          insert into codes (code, offer_id, user, created_at) values 
            ('qwerty12345',	'APPLE500', 1234567, Datetime('2025-10-14T14:40:09Z')),
            ('qwerty12346',	'APPLE500', 1234567, Datetime('2025-10-14T14:40:09Z')),
            ('qwerty12347',	'APPLE500', 1234567, Datetime('2025-10-14T14:40:09Z')),
            ('qwerty12348',	'APPLE500', 1234567, Datetime('2025-10-14T14:40:09Z')),
            ('qwerty12349',	'APPLE500', 1234567, Datetime('2025-10-14T14:40:09Z')),
            ('asdfgh67890',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z')),
            ('asdfgh67891',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z')),
            ('asdfgh67892',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z')),
            ('asdfgh67893',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z')),
            ('zxcvbn54321',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z')),
            ('zxcvbn54322',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z'))
        `)
    })
  })

  afterAll(async () => {
    await driver.destroy()
  })
});
