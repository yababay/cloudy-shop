import type { YC } from '../yc.js'
import { type QueryClient } from '@ydbjs/query'
import { Datetime, Uint64 } from '@ydbjs/value/primitive'
import { query } from '@ydbjs/query'
import showdown from 'showdown'
import type { Context } from 'telegraf'

import type { OrderDigitalItemDTO, OrderItemDTO } from '$lib/types/index.js'
import { deliverItems, getBusinessId, getChatUrl, openChat } from './net/yandex.js'
import { sendErrorMessage } from './telegram/messages.js'
import { activateTill, delay } from '$lib/util/date.js'
import { getRemoteDriver } from './ydb/driver.js'
import { sendDeliveryMessage } from './telegram/messages.js'

const converter = new showdown.Converter()

export const getFakeCode = async (sql: QueryClient) => {
    const [ [ row ] ] = await sql`select value as fakeCode from settings where key = 'FAKE_CODE'`
    const { fakeCode } = row as { fakeCode: string }
    if(!fakeCode) throw 'no fake code in settings'
    return fakeCode
}

export const delivery = async (event: YC.CloudFunctionsHttpEvent, context: YC.CloudFunctionsHttpContext) => {
    let payload = context.getPayload().toString() || 0
    if(!payload){
        const details = typeof event === 'object' && Reflect.get(event, 'details');
        if (details && typeof details === 'object') payload = +Reflect.get(details, 'payload');
    } 
    if(!(typeof payload === 'number' && !isNaN(payload))) throw 'bad payload'
    const driver = await getRemoteDriver()
    const sql = query(driver)
    await deliverAll(sql, payload)
    driver.close()

    return {
        statusCode: 200,
        body: 'ok',
        'headers': {
            'Content-Type': 'text/plain',
        },
        isBase64Encoded: false
    }
}

export const getSumAndCount = async (sql: QueryClient, orderId: Uint64 | bigint = TEST_ORDER_ID, fakeCode = FAKE_CODE) => {
    const goods = await prepareGoods(sql, orderId, fakeCode)
    const codes = Array.from(goods.values()).reduce((acc, arr: string[]) => [ ...acc, ...arr], [])
    const sum = codes.length
    const count = codes.filter(el => el.indexOf(fakeCode) === -1).length
    return { count, sum, goods }
}

export const deliverAll = async (sql: QueryClient, ttl: number, ctx?: Context) => {
    const [ rows ] = await sql`select distinct order_id, created_at from ordered_items where fulfilled_at is null and delivered_at is null;`
    if(!rows.length) return
    const oids = rows.map(row => {
        const { order_id, created_at } = row as { order_id: bigint, created_at: Datetime }
        return { orderId: order_id, ts: new Date(created_at.toString()) }
    })
    const previous = new Date()
    let mins = previous.getMinutes()
    mins -= ttl
    previous.setMinutes(mins)
    const ok = new Array<number>()
    const instructions = await prepareInstructions(sql)

    for(const {orderId, ts} of oids) {
        await delay()
        try {
            if(ttl && ts.getTime() > previous.getTime()) continue
            await deliverOrder(sql, { orderId }, instructions, ctx)
            ok.push(Number(orderId))
        }
        catch(err){
            console.log('delivery error', err)
            await sendErrorMessage(Number(orderId), err)
        }
    }
}

export const campaignByOrder = async (sql: QueryClient, orderId: Uint64 | bigint = TEST_ORDER_ID) => {
    const oid64 = typeof orderId === 'bigint' ? new Uint64(orderId) : orderId
    const [ [ row ] ] = await sql`select distinct campaign_id, order_id from ordered_items where order_id = ${oid64}`
    const { campaign_id, order_id } = row as { campaign_id: bigint, order_id: bigint }
    return [ campaign_id, order_id ]
}

type OrderWithGoods = { orderId: bigint, goods?: Map<string, string[]> }

export const deliverOrder = async (sql: QueryClient, order: OrderWithGoods, instructions: string[], ctx?: Context) => {

    const [ campaignId, orderId ] = await campaignByOrder(sql, order.orderId)
    const chatUrl = getChatUrl(Number(campaignId), Number(orderId))
    const [ACTIVATION_INSTRUCTION, HOLIDAY_INSTRUCTION, CHAT_FIRST_MESSAGE, FAKE_CODE] = instructions
        .map((instr, i) => i < 2 ? converter.makeHtml(instr.replace('CHAT_URL', chatUrl)) : instr)

    const FULL_INSTRUCTION = `${HOLIDAY_INSTRUCTION}\n\n${ACTIVATION_INSTRUCTION}`

    let goodsMap = order.goods || await prepareGoods(sql, orderId, FAKE_CODE)

    console.log('goods map', goodsMap)

    const activate_till = activateTill()
    const items = await restoreItems(sql, orderId)

    const goods: OrderDigitalItemDTO[] = items.map(({id, offerId}) => {
        const codes = goodsMap.get(offerId)
        if(!codes) throw 'no codes'
        return { id, codes, activate_till, slip: codes.includes(FAKE_CODE) ? FULL_INSTRUCTION : ACTIVATION_INSTRUCTION }
    })
    
    const reply = await deliverItems(Number(campaignId), Number(orderId), goods)
    if(typeof reply === 'boolean' && reply) await sql`update ordered_items set fulfilled_at = ${new Datetime(new Date)} where order_id = ${new Uint64(orderId)}`
    else throw `Маркет не принял товары: ${JSON.stringify(reply)}`

    const withChat = hasFake(goodsMap)

    if(withChat) {
        const businessId = await getBusinessId(Number(campaignId))
        await openChat(businessId, Number(orderId), CHAT_FIRST_MESSAGE)
    }

    await sendDeliveryMessage(Number(orderId), withChat ? chatUrl : '', ctx)
}

export const prepareInstructions = async (sql: QueryClient) => {

    const [ rows ] = await sql`select key, value from settings`

    const settings = new Map<string, string>(rows.map(row => {
        const { key, value } = row as { key: string, value: string }       
        return [ key, value ]
    }))

    const OPENING_HOURS_FROM = settings.get('OPENING_HOURS_FROM')
    const OPENING_HOURS_TO = settings.get('OPENING_HOURS_TO')
    const ACTIVATION_INSTRUCTION = settings.get('ACTIVATION_INSTRUCTION')
    const HOLIDAY_INSTRUCTION = settings.get('HOLIDAY_INSTRUCTION') 
    const CHAT_FIRST_MESSAGE = settings.get('CHAT_FIRST_MESSAGE')
    const FAKE_CODE = settings.get('FAKE_CODE')

    if(!(ACTIVATION_INSTRUCTION && HOLIDAY_INSTRUCTION && CHAT_FIRST_MESSAGE && FAKE_CODE && OPENING_HOURS_FROM && OPENING_HOURS_TO)) throw 'bad settings'

    const replaced = [ACTIVATION_INSTRUCTION, HOLIDAY_INSTRUCTION, CHAT_FIRST_MESSAGE].map(instr => instr
        .replaceAll('OPENING_HOURS_FROM', OPENING_HOURS_FROM)
        .replaceAll('OPENING_HOURS_TO', OPENING_HOURS_TO))
    
    return [ ...replaced, FAKE_CODE ]
}

export const hasFake = (goods: Map<string, string[]>, fakeCode = FAKE_CODE) => {
    for(const [_, codes] of goods.entries()){
        if(codes.includes(fakeCode)) return true
    }
    return false
} 

export const prepareGoods = async (sql: QueryClient, orderId: Uint64 | bigint = TEST_ORDER_ID, fakeCode = FAKE_CODE) => {

    const items = await restoreItems(sql, orderId)

    const codesByOffer = new Map<string, string[]>()

    const oid64 = typeof orderId === 'bigint' ? new Uint64(orderId) : orderId

    await sql`update codes set order_id = null where order_id = ${oid64}`

    const emoji = Array.from(new Set<string>([
        '🕛', '🕧', '🕐', '🕜', '🕑', '🕝', '🕒', '🕞', '🕓', '🕟', '🕔', '🕠', '🕕', '🕡', '🕖', '🕢', '🕗', '🕣', 
        '🕘', '🕤', '🕙', '🕥', '🕚', '🕦', '⌛️', '⏳', '⌚️', '⏱️', '⏲️', '🕰', '⏰', '⏱️', 
        '✔️', '✅', '❎', '🟩', '🟦', '🟧', '🟥', '🟪', '🟫', '⬛️', '⬜️', '🌲', '🌴', '🌳', '🌵', '🏝', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌱', '✨', '⭐️', '🚀', '🌌', '📡', '💻', '💿', '📀', '💽', '📸', '⚡️', '🌀', '🍥', '🥢', '🥁', '🎸', '🎺', '🎷', '🪗', '🎹', '🎵', '🪇', '🎼', '🌠', '🌍', '🧭', '✈️'
    ]))
    
    for(const { count, offerId } of items){
        const codes = new Array<string>(count).fill(fakeCode).map((el, i) => `${emoji[i]} ${el}`)
        for(let i = 0; i < count; i++){
            await delay()
            const [ [ row ] ] = await sql`select code from codes where order_id is null and offer_id = ${offerId} limit 1`
            if(!row) break
            const { code } = row as { code: string }
            codes[i] = code
            await sql `update codes set order_id = ${oid64} where code = ${code}`
        }
        codesByOffer.set(offerId, codes)
    }

    return codesByOffer
}

export const restoreItems = async (sql: QueryClient, orderId: Uint64 | BigInt = TEST_ORDER_ID) => {
    const [ rows ] = await sql`select item_id as id, amount as count, offer_id as offerId from ordered_items where order_id = ${orderId}`
    if(!rows) throw 'no rows ' + JSON.stringify(rows)
    const items: OrderItemDTO[] = rows.map(row => {
        if(!(row && typeof row === 'object')) throw 'bad item'
        const id = Reflect.get(row, 'id')
        const count = Reflect.get(row, 'count')
        const offerId = Reflect.get(row, 'offerId')
        return {id: Number(id), count: Number(count), offerId}
    })
    return items
}

export const insertTestingData = async (sql: QueryClient) => {
    await sql`
        insert into codes (code, offer_id, user, created_at) values 
            ('qwerty12345',	'APPLE500', 1234567, Datetime('2025-10-14T08:38:46Z')),
            ('qwerty12346',	'APPLE500', 1234567, Datetime('2025-10-14T14:40:09Z')),
            ('qwerty12347',	'APPLE500', 1234567, Datetime('2025-10-14T14:40:09Z')),
            ('qwerty12348',	'APPLE500', 1234567, Datetime('2025-10-14T14:40:09Z')),
            ('qwerty12349',	'APPLE500', 1234567, Datetime('2025-10-14T14:40:09Z')),
            ('asdfgh67890',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z')),
            ('asdfgh67891',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z')),
            ('asdfgh67892',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z')),
            ('asdfgh67893',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z')),
            ('zxcvbn54321',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z')),
            ('zxcvbn54322',	'APPLE5050', 1234567, 	Datetime('2025-10-14T14:40:09Z'));
    `
    await sql`
      insert into ordered_items (item_id, order_id, campaign_id, offer_id,  amount, created_at) values 
      (968316434, ${TEST_ORDER_ID}, ${TEST_CAMPAIGN_ID}, 'APPLE500',  1,  Datetime('2025-10-14T14:40:09Z')),
      (968316435, ${TEST_ORDER_ID}, ${TEST_CAMPAIGN_ID}, 'APPLE5000', 10, Datetime('2025-10-14T14:40:09Z')),
      (968316436, ${TEST_ORDER_ID}, ${TEST_CAMPAIGN_ID}, 'APPLE5050', 3,  Datetime('2025-10-14T14:40:09Z'));
    `
}

export const insertInstructions = async (sql: QueryClient) => {
    await sql`
        delete from settings;
        insert into settings (key, value) values 
            ('OPENING_HOURS_FROM', '8:00'),
            ('OPENING_HOURS_TO', '22:00'),
            ('ACTIVATION_INSTRUCTION', 'ываываы ывыываыв OPENING_HOURS_FROM ваываыва OPENING_HOURS_TO fsdfsdfsdfsfsf'),
            ('HOLIDAY_INSTRUCTION', 'ываываы ывыываыв OPENING_HOURS_FROM ваываыва OPENING_HOURS_TO fsdfsdfsdfsfsf'), 
            ('CHAT_FIRST_MESSAGE', 'ываываы ывыываыв OPENING_HOURS_FROM ваываыва OPENING_HOURS_TO fsdfsdfsdfsfsf'),
            ('FAKE_CODE', 'ОБРАТИТЕ ВНИМАНИЕ!');
    `
}

export const getOffers = () => {
    const arr = new Array<number>()
    let id = 500
    while(id <= 9000) {
        arr.push(id)
        id += 50
    }
    return arr.map(id => `APPLE${id}`)
}
  
export const createTables = async (sql: QueryClient) => {
    await sql`
      DROP TABLE IF EXISTS codes;
      DROP TABLE IF EXISTS ordered_items;
      DROP TABLE IF EXISTS offers;
      CREATE TABLE IF NOT EXISTS codes (
          code Text,
          offer_id Text,
          user Uint64,
          created_at Datetime,
          updated_at Datetime,
          order_id Uint64,
        PRIMARY KEY (code)
      );

      CREATE TABLE IF NOT EXISTS settings (
          key Text,
          value Text,
          primary key (key)
      );

      CREATE TABLE IF NOT EXISTS ordered_items (
          item_id Uint64,
          order_id Uint64,
          campaign_id Uint64,
          offer_id Text,
          amount Uint64,
          created_at DATETIME,
          fulfilled_at DATETIME,
          delivered_at DATETIME,
          primary key(item_id)
      );

      CREATE TABLE IF NOT EXISTS offers (
          id Text,
          name Text,
          description Text,
          price Uint64,
          primary key(id)
      );
    `
}

const TEST_ORDER_ID = new Uint64(49803606592n)
const TEST_CAMPAIGN_ID = new Uint64(110987348n)
const FAKE_CODE = 'FAKE_CODE'

export {
    TEST_ORDER_ID,
    TEST_CAMPAIGN_ID,
    FAKE_CODE
}


