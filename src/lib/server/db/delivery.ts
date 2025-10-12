import  YDB from 'ydb-sdk'
import { restoreItems } from './fulfill.js'
import { intFromQuery, prepareInstruction, rowsFromResultSets, stringFromItem, stringFromQuery } from './util.js'
import { Item } from '../../types/yandex.js'
import { deliverItems, getBusinessId, openChat } from '../yandex.js'
import showdown from 'showdown'

const converter = new showdown.Converter()

export const prepareAndSendItems = async (session: YDB.TableSession, orderId: number) => {
    const items = await getFullfilled(session, orderId)
    const [ activationInstruction, fakeInstruction, chatFirstMessage, fakeCode ] = await prepareInstruction(session)

    const fullInstruction = `${fakeInstruction}\n\n${activationInstruction}`
    const activate_till = '2050-01-01'

    const goodsMap = items.reduce((acc, { id, code }) => {
        const codes = acc.get(id)
        acc.set(id, codes ? [ ...codes, code ] : [code])
        return acc
    }, new Map<number, string[]>)

    const goods = Array.from(goodsMap.entries()).map(([id, codes]) => ({id, codes, activate_till, slip: activationInstruction}))

    let chatUrl: string = ''

    const campaignId = await intFromQuery(session, `select campaign_id from ordered_items where order_id = ${orderId}`)
    const businessId = await getBusinessId(campaignId)

    for(const good of goods) {
        const { codes } = good
        if(!codes.includes(fakeCode)) continue
        good.slip = fullInstruction
        if(!chatUrl){
            await openChat(businessId, orderId, chatFirstMessage)
            chatUrl = `https://partner.market.yandex.ru/shop/78545618/arbiter/47676459969?utm_source=market_partner&utm_medium=email&utm_campaign=msg_1617096644&utm_content=campaign_78545618%7Cshop_96903286`
        }
        good.slip.replace('CHAT_URL', chatUrl)
    }
    
    for(const good of goods) good.slip = converter.makeHtml(good.slip)

    // return goods
    await deliverItems(campaignId, orderId, goods)

    return chatUrl

    /*if(!force && !this.isFulfilled(await this.getFulfillness())) throw 'not fulfilled yet'
    const that = this
    const order = await this.fetchOrder()
    const { items } = order
    const codes = await Promise.all(items.map(({offerId}) => {
        const key = that.getItemCodesKey(offerId)
        return client.lRange(key, 0, 1000)
    }))
    const fakeCode = await client.hGet("yandex-market:settings", "FAKE_CODE")
    const fakeInstruction = await client.hGet("yandex-market:settings", "HOLIDAY_INSTRUCTION")
    const activationInstruction = await client.hGet("yandex-market:settings", "ACTIVATION_INSTRUCTION")
    const hoursFrom = await client.hGet("yandex-market:settings", "OPENING_HOURS_FROM")
    const hoursTo = await client.hGet("yandex-market:settings", "OPENING_HOURS_TO")
    if(!fakeCode) throw 'no fake code in settings'
    if(!fakeInstruction) throw 'no fake instruction in settings'
    if(!activationInstruction) throw 'no activation instruction in settings'
    if(!hoursFrom) throw 'no hours from in settings'
    if(!hoursTo) throw 'no hours to in settings'
    const fullInstruction = `${fakeInstruction}\n\n${activationInstruction}`
    let withFakes = false
    const goods: OrderDigitalItemDTO[] = items.map(({id, count}, i) => {
        const activate_till = '2050-01-01'
        const dummy = new Array<string>(count)
        dummy.fill(fakeCode)
        for(const code of codes[i]){
            dummy.push(code)
            dummy.shift()
        }
        const _withFakes = dummy.includes(fakeCode)
        withFakes ||= _withFakes
        const slip = converter.makeHtml((_withFakes ? fullInstruction : activationInstruction)
            .replaceAll('OPENING_HOURS_FROM', hoursFrom)
            .replaceAll('OPENING_HOURS_TO', hoursTo))
            //.replaceAll('CHAT_URL', chatId))
        dummy.reverse()
        return { activate_till, slip, id, codes: dummy }
    })
    let chatUrl = ''
    if(withFakes){
        const { orderId } = this
        const url = `${YANDEX_URL_PREFIX}/businesses/${BUSINESS_ID}/chats/new`
        const params = prepareParams(url, 'POST', AUTH_HEADER)
        const { data } = await commonFetch(params, { orderId })
        const chatId = Reflect.get(data.result, 'chatId')
        const msgUrl = `${YANDEX_URL_PREFIX}/businesses/${BUSINESS_ID}/chats/message?chatId=${chatId}`
        const message = ((await client.hGet("yandex-market:settings", "CHAT_FIRST_MESSAGE")) || 'hello')
            .replaceAll('OPENING_HOURS_FROM', hoursFrom)
            .replaceAll('OPENING_HOURS_TO', hoursTo)
        const chatParams = prepareParams(msgUrl, 'POST', AUTH_HEADER)
        const body = { message }
        const resp = await commonFetch(chatParams, body)
        //chatUrl = `https://partner.market.yandex.ru/business/${BUSINESS_ID}/arbiter?campaignId=${CAMPAIGN_ID}&chatId=${chatId}&chatGroup=ORDER`
        chatUrl = `https://partner.market.yandex.ru/shop/78545618/arbiter/47676459969?utm_source=market_partner&utm_medium=email&utm_campaign=msg_1617096644&utm_content=campaign_78545618%7Cshop_96903286`
        for(const good of goods) good.slip = good.slip.replace('CHAT_URL', chatUrl)
    }
    const { deliveryUrl } = this
    const params = prepareParams(deliveryUrl, 'POST', AUTH_HEADER)
    const { data } = await commonFetch(params, { items: goods })
    console.log(new Date().toISOString(), 'with fakes', withFakes, data)
    return chatUrl
    */
}

export const getFullfilled = async (session: YDB.TableSession, orderId: string | number) => {

    const fakeCode = await stringFromQuery(session, `select value from settings where key = 'FAKE_CODE'`) 

    console.log('fake', fakeCode)

    const items = (await restoreItems(session, orderId)).reduce((acc, item) => {
        for(let i = 0; i < item.count; i++) acc.push({ ...item, code: fakeCode })
        return acc
    }, new Array<Item>())

    console.log('items', items)

    const result = await session.executeQuery(`select code, offer_id from codes where order_id = ${orderId}`)
    const codes = rowsFromResultSets(result).map(({items}) => {
        const [codeItem, offerItem] = items
        const code = stringFromItem(codeItem)
        const offer = stringFromItem(offerItem)   
        return [ code, offer ]
    })

    for(const item of items) {
        const i = codes.findIndex(([ _, offer ]) => offer === item.offerId)
        if(i === -1) continue
        const [ row ] = codes.splice(i, 1)
        const [ code ] = row
        item.code = code
    }

    return items
}
