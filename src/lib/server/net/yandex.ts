import type { OrderDigitalItemDTO, OrderDTO } from "../../types/index.js"
import { getWithToken, postWithToken } from "./util.js"

export const apiPrefixV2 = 'https://api.partner.market.yandex.ru/v2'

export const getOrder = async (campaignId: number, orderId: number) => {
    const data = await getWithToken(`${apiPrefixV2}/campaigns/${campaignId}/orders/${orderId}`)
    return data as { order: OrderDTO }
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

export const openChat = async (businessId: number, orderId: number | string, message: string) => {  
    const chatId = await getChatId(businessId, orderId)
    const url = `${apiPrefixV2}/businesses/${businessId}/chats/message?chatId=${chatId}`
    const data = (await postWithToken(url, { message })) as { status: string }
    const { status } = data
    if(status !== 'OK') throw 'chat is not opened' + JSON.stringify(data)
    return chatId
}

export const deliverItems = async (campaignId: number, orderId: number | string, items: OrderDigitalItemDTO[]) => {
    const url = `${apiPrefixV2}/campaigns/${campaignId}/orders/${orderId}/deliverDigitalGoods`
    console.log(campaignId, orderId)
    const reply = (await postWithToken(url, { items })) as { status: number | string }
    const { status } = reply
    return status === 'OK' || reply
}
