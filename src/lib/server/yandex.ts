import axios from "axios"
import type { Order } from "../types/yandex.js"
import { getWithToken, postWithToken } from "./net.js"

const apiPrefixV2 = 'https://api.partner.market.yandex.ru/v2'

export const getOrder = async (campaignId: number, orderId: number) => {
    const data = await getWithToken(`${apiPrefixV2}/campaigns/${campaignId}/orders/${orderId}`)
    return data as { order: Order }
}

export const getBusinessId = async (campaignId: number | string) => {
    const url = `${apiPrefixV2}/campaigns/${campaignId}`
    const data = await getWithToken(url)
    const { campaign } = data
    const { business } = campaign
    const { id } = business
    return id
}

export const getChatId = async (businessId: number | string, orderId: number | string) => {
    const url = `${apiPrefixV2}/businesses/${businessId}/chats/new`
    const reply = (await postWithToken(url, { orderId })) as { result: {chatId: number | string}, status: string}
    const { status, result } = reply
    if(status !== 'OK') throw 'Не удалось создать чат'
    const { chatId } = result
    return chatId
}

export const getChatUrl = (campaignId: number | string, orderId: number | string) => `https://partner.market.yandex.ru/shop/${campaignId}/arbiter/${orderId}`
//`https://partner.market.yandex.ru/shop/78545618/arbiter/47676459969?utm_source=market_partner&utm_medium=email&utm_campaign=msg_1617096644&utm_content=campaign_78545618%7Cshop_96903286`
//`https://partner.market.yandex.ru/shop/${campaignId}/arbiter/${orderId}?utm_source=market_partner&utm_medium=email&utm_campaign=msg_1617366066&utm_content=campaign_${campaignId}%7Cshop_${businessId}`
//`https://partner.market.yandex.ru/shop/${campaignId}/arbiter/${orderId}?utm_source=market_partner&utm_medium=email&utm_campaign=msg_1617366066&utm_content=campaign_${campaignId}%7Cshop_${businessId}`

export const openChat = async (businessId: number, orderId: number | string, message: string) => {  
    const chatId = await getChatId(businessId, orderId)
    const url = `${apiPrefixV2}/businesses/${businessId}/chats/message?chatId=${chatId}`
    const data = (await postWithToken(url, { message })) as { status: string }
    const { status } = data
    if(status !== 'OK') throw 'chat is not opened' + JSON.stringify(data)
    return chatId
}

export const deliverItems = async (campaignId: number, orderId: number | string, items: { id: number, codes: string[], slip: string, activate_till: string }[]) => {
    const url = `${apiPrefixV2}/campaigns/${campaignId}/orders/${orderId}/deliverDigitalGoods`
    const reply = (await postWithToken(url, { items })) as { status: number | string }
    const { status } = reply
    return status === 'OK' || reply
}
