import  YDB from 'ydb-sdk'
import showdown from 'showdown'

import { 
    compaignByOrder, 
    getDriver, 
    getUnfilled, 
    tryToFulfill, 
    getYDBTimestamp, 
    rowsFromResult, 
    stringFromItem, 
    deliverItems, 
    getBusinessId, 
    getChatUrl, 
    openChat, 
    sendDeliveryMessage, 
    sendErrorMessage, 
    text, 
    isFulfilled
} from '../index.js'

import type { Item } from '$lib/types/index.js'

const converter = new showdown.Converter()

export const prepareAndSend = async (session: YDB.TableSession, orderId: number | string, items: Item[], codes: Map<string, string[]>, instructions: string[]) => {

    const campaignId = await compaignByOrder(session, orderId)
    const chatUrl = getChatUrl(campaignId, orderId)
    const [ACTIVATION_INSTRUCTION, HOLIDAY_INSTRUCTION, CHAT_FIRST_MESSAGE, FAKE_CODE] = instructions.map((instr, i) => i < 2 ? converter.makeHtml(instr.replace('CHAT_URL', chatUrl)) : instr)
    const getCodes = (offerId: string, count: number) => {
        const stub = new Array<string>(count).fill(FAKE_CODE)
        const fulfilled = codes.get(offerId) || []
        return [ ...fulfilled, ...stub ]
    }
    const FULL_INSTRUCTION = `${HOLIDAY_INSTRUCTION}\n\n${ACTIVATION_INSTRUCTION}`
    const activate_till = '2050-01-01'
    let withChat = false
    const goods = items.map(({id, offerId, count}) => {
        const codes = getCodes(offerId, count)
        const withFake = codes.includes(FAKE_CODE)
        withChat ||= withFake
        const slip = withFake ? FULL_INSTRUCTION : ACTIVATION_INSTRUCTION
        return { id, codes, activate_till, slip }
    })
    const reply = await deliverItems(campaignId, orderId, goods)
    if(typeof reply === 'boolean' && reply) await session.executeQuery(`update ordered_items set fulfilled_at = ${getYDBTimestamp()} where order_id = ${orderId}`)
    else throw `Маркет не принял товары: ${JSON.stringify(reply)}`
    if(withChat) {
        const businessId = await getBusinessId(campaignId)
        await openChat(businessId, orderId, CHAT_FIRST_MESSAGE.replace('CHAT_URL', chatUrl))
    }
    return withChat ? chatUrl : ''
}

export const prepareInstructions = async (session: YDB.TableSession) => {

    const result = await session.executeQuery(`select key, value from settings`)

    const settings = new Map<string, string>(rowsFromResult(result).map(({items}) => {
        const [ key, value ] = items || []
        return [ stringFromItem(key), stringFromItem(value)  ]
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

export const deliverOrder = async (session: YDB.TableSession, id: number | string, instructions: string[], force = false) => {
    const { items, codes } = await tryToFulfill(session, id)
    const ff = isFulfilled(items, codes)
    let chat = ''
    if(ff || force) chat = await prepareAndSend(session, id, items, codes, instructions)
    await sendDeliveryMessage(id, chat)
    return ff
}

export const deliverAll = async (session: YDB.TableSession, force = false) => {
    const oids = await getUnfilled(session)
    const previous = new Date()
    let mins = previous.getMinutes()
    mins -= +(process.env.YM_DELIVERY_TERM || 20)
    previous.setMinutes(mins)
    const ok = new Array<number>()
    const instructions = await prepareInstructions(session)

    for(const {id, ts} of oids) {
        if(ts.getTime() > previous.getTime()) continue // too young
        try {
            await deliverOrder(session, id, instructions, force)
            ok.push(id)
        }
        catch(err){
            console.log('delivery error', err)
            await sendErrorMessage(id, err)
        }
    }
    return ok
}

export const delivery = async () => {

    const driver = await getDriver()

    const processed = await driver.tableClient.withSession(async (session) => {
        return await deliverAll(session, true)
    })

    await driver.destroy()

    let message = `Необработанных заказов не обнаружено.`

    if(processed.length){
        const plural = processed.length > 1
        const ending = plural && 'ы' || ''
        message = `Обработан${ending} заказ${ending} ${plural ? '№№' : '№'} ${processed.join(', ')}.`
    }

    console.log(message)
    
    return text(message)
}
