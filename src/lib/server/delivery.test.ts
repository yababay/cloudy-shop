import { Driver } from '@ydbjs/core'
import { query } from '@ydbjs/query'
import { expect, describe, it, beforeAll, afterAll } from 'vitest'
import { getDriver } from './ydb/index.js'
import { campaignByOrder, createTables, FAKE_CODE, getSumAndCount, hasFake, insertInstructions, insertTestingData, prepareGoods, prepareInstructions, restoreItems, TEST_CAMPAIGN_ID } from './delivery.js'
import { activateTill } from '../util/date.js'

let driver: Driver | undefined = undefined

describe('Campaign id', async () => {

  it('should be correct', async () => {
      if(!driver) throw 'no driver'
      const sql = query(driver)
      const campaignId = await campaignByOrder(sql)
      console.log(Number(campaignId))
      expect(Number(campaignId)).toBeTypeOf('number')
  })

  beforeAll(async () => {
    driver = await getDriver()
    const sql = query(driver)
    await createTables(sql)
    await insertTestingData(sql)
  })

  afterAll(() => {if(driver) driver.close()})
})

describe.skip('Sum and count', async () => {

  it('should be correct', async () => {
      if(!driver) throw 'no driver'
      const sql = query(driver)
      const { sum, count } = await getSumAndCount(sql)
      expect(sum).toBe(14)
      expect(count).toBe(4)
  })

  beforeAll(async () => {
    driver = await getDriver()
    const sql = query(driver)
    await createTables(sql)
    await insertTestingData(sql)
  })

  afterAll(() => {if(driver) driver.close()})
})

describe.skip('Delivery', async () => {

  it('should has correct company id', async () => {
    if(!driver) throw 'no driver'
      const sql = query(driver)
      const goods = await prepareGoods(sql)
      const ok = hasFake(goods)
      const campaignId = await campaignByOrder(sql)
      expect(campaignId).toBe(TEST_CAMPAIGN_ID.value)
  })

  beforeAll(async () => {
    driver = await getDriver()
    const sql = query(driver)
    await createTables(sql)
    await insertTestingData(sql)
  })

  afterAll(() => {if(driver) driver.close()})
})

describe.skip('Instructions', async () => {

    it('should be correct', async () => {
        if(!driver) throw 'no driver'
        const sql = query(driver)
        const [ ACTIVATION_INSTRUCTION, HOLIDAY_INSTRUCTION, CHAT_FIRST_MESSAGE, FAKE_CODE  ] = await prepareInstructions(sql)
        expect(ACTIVATION_INSTRUCTION.includes('8:00')).toBeTruthy()
        expect(ACTIVATION_INSTRUCTION.includes('22:00')).toBeTruthy()
        expect(HOLIDAY_INSTRUCTION.includes('8:00')).toBeTruthy()
        expect(HOLIDAY_INSTRUCTION.includes('22:00')).toBeTruthy()
        expect(CHAT_FIRST_MESSAGE.includes('8:00')).toBeTruthy()
        expect(CHAT_FIRST_MESSAGE.includes('22:00')).toBeTruthy()
        expect(FAKE_CODE.includes('!')).toBeTruthy()
    })

    beforeAll(async () => {
        driver = await getDriver()
        const sql = query(driver)
        await insertInstructions(sql)
    })

    afterAll(() => {if(driver) driver.close()})
})

describe.skip('Activate till date', () => {
    it('should be cottect', async () => {
        const now = new Date
        const at = activateTill()
        const atDate = new Date(at)
        const nowYears = now.getFullYear()
        const atYears = atDate.getFullYear()
        expect(atYears - nowYears).toBe(25)
    })
})

describe.skip('Goods', async () => {

    it('should be prepared', async () => {

      if(!driver) throw 'no driver'
        const sql = query(driver)
        const goods = await prepareGoods(sql)

        const ok = hasFake(goods)
        expect(ok).toBeTruthy()

        const apple500Codes = (goods.get('APPLE500') || []).filter(el => el !== FAKE_CODE)
        expect(apple500Codes.length).toBe(1)

        const apple5050Codes = (goods.get('APPLE5050') || []).filter(el => el !== FAKE_CODE)
        expect(apple5050Codes.length).toBe(3)

        const apple5000Codes = (goods.get('APPLE5000') || []).filter(el => el !== FAKE_CODE)
        expect(apple5000Codes.length).toBe(0)

        const [ [ _row ] ] = await sql`select count(*) as count from codes where order_id is null`
        const { count } = _row as { count: BigInt }
        expect(Number(count)).toBe(7)
    })

    beforeAll(async () => {
      driver = await getDriver()
      const sql = query(driver)
      await createTables(sql)
      await insertTestingData(sql)
    })

    afterAll(() => {if(driver) driver.close()})
})

describe.skip('Items', () => {
    it('should be restored', async () => {
        if(!driver) throw 'no driver'
        const sql = query(driver)
        const items = await restoreItems(sql)
        expect(items.length).toBe(3)      
    })

    beforeAll(async () => {
        driver = await getDriver()
        const sql = query(driver)
        await createTables(sql)
        await insertTestingData(sql)
    })

    afterAll(() => {if(driver) driver.close()})
})
