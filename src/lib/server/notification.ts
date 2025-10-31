import { query } from '@ydbjs/query'
import { Datetime, Uint64 } from '@ydbjs/value/primitive'
import type { OrderDTO, OrderItemDTO } from '$lib/types/yandex.js'
import type { YC } from '../yc.js'
import { getOrder } from './net/yandex.js'
import { sendErrorMessage, sendMessage, sendOrderCreatedMessage, sendOrderDeliveredMessage, sendProcessingStartedMessage } from './telegram/messages.js'
import { getRemoteDriver } from './ydb/driver.js'
import { deliverOrder, getSumAndCount, prepareInstructions } from './delivery.js'

const reply = {
    statusCode: 200,
    body: JSON.stringify({
        name: "shop",
        time: new Date().toISOString(),
        version: "1.0.0"
    }),
    'headers': {
        'Content-Type': 'application/json',
    },
    isBase64Encoded: false
}

export const notification = async (event: YC.CloudFunctionsHttpEvent, context: YC.CloudFunctionsHttpContext) => {

    const { httpMethod } = event
    if(httpMethod.toLocaleLowerCase() !== 'post') throw 'Please use the POST method'
    let payload = context.getPayload()
    if(!(payload && typeof payload === 'object')) throw 'no object in payload'
    const { status, substatus, orderId, campaignId, notificationType } = payload as OrderDTO

    const created_at = new Datetime(new Date)
    const order_id = new Uint64(BigInt(orderId))
    const campaign_id = new Uint64(BigInt(campaignId))

    try {

        if(status === 'PROCESSING' && substatus === 'STARTED'){

            const { order } = (await getOrder(campaignId, orderId)) as { order: {items: OrderItemDTO[]}}
            const { items } = order

            const values = items.map(({id, count, offerId}) => {
                const offer_id = offerId
                const item_id = new Uint64(BigInt(id))
                const amount = new Uint64(BigInt(count))
                return { item_id, order_id, offer_id, amount, created_at, campaign_id }
            })

            const driver = await getRemoteDriver()
            const sql = query(driver)

            await sql`upsert into ordered_items select * from as_table(${values});`
            const { sum, count, goods } = await getSumAndCount(sql, order_id)
            if(sum === count){
                const instructions = await prepareInstructions(sql)
                await deliverOrder(sql, {orderId: BigInt(orderId), goods}, instructions)
            }
            else await sendProcessingStartedMessage(orderId, items, count, sum)

            driver.close()
            return reply

        }

        if(notificationType === 'ORDER_CREATED') {
            await sendOrderCreatedMessage(orderId)
            return reply
        }
        
        if(status === 'DELIVERED'){
            const driver = await getRemoteDriver()
            const sql = query(driver)
            await sql`update ordered_items set delivered_at = ${new Datetime(new Date)} where order_id = ${order_id}`
            driver.close()
            await sendOrderDeliveredMessage(orderId)
            return reply
        }

        return reply

    }
    catch (err) {
        const body = `500: ${err}`
        await sendErrorMessage(orderId, body)
        return {
            statusCode: 500,
            body
        };
    }
}
