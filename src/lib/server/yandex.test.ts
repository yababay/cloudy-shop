import type { Driver } from 'ydb-sdk';
import { getDriver } from './ydb/driver4vitest.js';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { getBusinessId, compaignByOrder, openChat } from './index.js';

const ORDER_ID = 49910220737
const BUSINESS_ID = 96740316
const CAMPAIGN_ID = 110987348

let driver: Driver

describe.skip('Chat id', () => {
  it('should be correct', async () => {
    const chatId = await openChat(BUSINESS_ID, ORDER_ID, 'Открываем чат из юнит-теста')
    expect(chatId).toBeTypeOf('number')
  })
})

describe.skip('Company id', () => {

  it('should be correct', async () => {
    await driver.tableClient.withSession(async (session) => {
      const compaignId = await compaignByOrder(session, ORDER_ID)
      expect(compaignId).toBe(CAMPAIGN_ID)
    })
  })

  beforeAll(async () => {
    driver = await getDriver()
  })

  afterAll(async () => {
    await driver.destroy()
  })
});

describe.skip('Business id', () => {

  it('should be correct', async () => {
    const businessId = await getBusinessId(CAMPAIGN_ID)
    expect(businessId).toBe(BUSINESS_ID)
  })
});
