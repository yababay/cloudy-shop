import axios from "axios"
import { Order } from "../types/index.js"

const apiPrefixV2 = 'https://api.partner.market.yandex.ru/v2'

const { YM_API_KEY } = process.env

if(!YM_API_KEY) throw 'no yandex token'

const apiKey: string = YM_API_KEY

export const headers = { 'Api-Key': apiKey }

export const getOrder = async (campaignId: number, orderId: number) => {
    const { data } = await axios.get(`${apiPrefixV2}/campaigns/${campaignId}/orders/${orderId}`, { headers })
    return data as { order: Order }
}

export const getBusinessId = async (campaignId: number | string) => {
    const url = `${apiPrefixV2}/campaigns/${campaignId}`
    const { data } = await axios.get(url, { headers })
    const { campaign } = data
    const { business } = campaign
    const { id } = business
    return id
}

export const getChatId = async (businessId: number | string, orderId: number | string) => {
    const url = `${apiPrefixV2}/businesses/${businessId}/chats/new`
    const { data } = (await axios.post(url, { orderId }, { headers })) as { data: { result: {chatId: number | string}} }
    const { result } = data
    const { chatId } = result
    return chatId
}

export const openChat = async (businessId: number, orderId: number | string, message: string) => {  
    const chatId = await getChatId(businessId, orderId)
    const url = `${apiPrefixV2}/businesses/${businessId}/chats/message?chatId=${chatId}`
    const { data } = (await axios.post(url, { message }, { headers })) as { data: { status: string }}
    const { status } = data
    if(status !== 'OK') throw 'chat is not opened' + JSON.stringify(data)
}

export const deliverItems = async (campaignId: number, orderId: number, items: { id: number, codes: string[], slip: string, activate_till: string }[]) => {
    const url = `${apiPrefixV2}/campaigns/${campaignId}/orders/${orderId}/deliverDigitalGoods`
    const { data } = (await axios.post(url, { items }, { headers })) as { data: { status: string }}
    const { status } = data
    if(status !== 'OK') throw 'chat is not opened' + JSON.stringify(data)
}