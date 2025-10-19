import  YDB from 'ydb-sdk'
import showdown from 'showdown'

import { 
    compaignByOrder, 
    getDriver, 
    getUnfilled, 
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
    getSumAndCount,
    restoreItems
} from '../index.js'
import type { Context } from 'telegraf'

const converter = new showdown.Converter()

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

export const getItemsAndCodes = async (session: YDB.TableSession, id: number | string) => {
    const items = await restoreItems(session, id)
    const result = await session.executeQuery(`select code, offer_id from codes where order_id = ${id}`)
    const codes = rowsFromResult(result).map(({items}) => {
        if(!items) throw 'no items in fulfilled result'
        const [ codeItem, offerItem ] = items
        return { code: stringFromItem(codeItem), offer: stringFromItem(offerItem) }
    }).reduce((acc, {code, offer}) => {
        const codes = acc.get(offer)
        acc.set(offer, codes ? [ ...codes, code ] : [ code ])
        return acc
    }, new Map<string, string[]>())
    return { items, codes }
}

export const deliverOrder = async (session: YDB.TableSession, id: number | string, instructions: string[], ctx?: Context) => {
    const { items, codes } = await getItemsAndCodes(session, id)
    const campaignId = await compaignByOrder(session, id)
    const chatUrl = getChatUrl(campaignId, id)
    const [ACTIVATION_INSTRUCTION, HOLIDAY_INSTRUCTION, CHAT_FIRST_MESSAGE, FAKE_CODE] = instructions.map((instr, i) => i < 2 ? converter.makeHtml(instr.replace('CHAT_URL', chatUrl)) : instr)
    const getCodes = (offerId: string, count: number) => {
        const stub = new Array<string>(count).fill(FAKE_CODE)
        const fulfilled = codes.get(offerId) || []
        return [ ...fulfilled, ...stub ].slice(0, count)
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

    const reply = await deliverItems(campaignId, id, goods)
    if(typeof reply === 'boolean' && reply) await session.executeQuery(`update ordered_items set fulfilled_at = ${getYDBTimestamp()} where order_id = ${id}`)
    else throw `Маркет не принял товары: ${JSON.stringify(reply)}`

    if(withChat) {
        const businessId = await getBusinessId(campaignId)
        await openChat(businessId, id, CHAT_FIRST_MESSAGE.replace('CHAT_URL', chatUrl))
    }

    await sendDeliveryMessage(id, withChat ? chatUrl : '', ctx)
    //console.log(JSON.stringify(goods))
    return {codes, items}
}

export const deliverAll = async (session: YDB.TableSession, ctx?: Context) => {
    const oids = await getUnfilled(session)
    const previous = new Date()
    let mins = previous.getMinutes()
    mins -= +(process.env.YM_DELIVERY_TERM || 20)
    previous.setMinutes(mins)
    const ok = new Array<number>()
    const instructions = await prepareInstructions(session)

    for(const {id, ts} of oids) {
        try {
            const { sum, count } = await getSumAndCount(session, id)
            if(!(sum === count || ts.getTime() < previous.getTime())) continue
            await deliverOrder(session, id, instructions, ctx)
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
        return await deliverAll(session)
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
