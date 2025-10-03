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
