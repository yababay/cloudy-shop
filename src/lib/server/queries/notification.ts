import { deliverOrder, getDriver, getOrder, getYDBTimestamp, prepareInstructions, sendErrorMessage, sendOrderCreatedMessage, sendOrderDeliveredMessage, sendProcessingStartedMessage } from '../index.js'
import type { Item, Order } from '../../types/index.js'
import type { YC } from '../../yc.js'

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

    const { status, substatus, orderId, campaignId, notificationType } = payload as Order

    try {

        if(status === 'PROCESSING' && substatus === 'STARTED'){

            if(!campaignId) throw 'no campaign id'

            const { order } = (await getOrder(campaignId, orderId)) as { order: {items: Item[]}}

            const query = `upsert into ordered_items (item_id, order_id, campaign_id, offer_id, amount, created_at) values`
            const { items } = order
            const values = new Array<string>()

            for(const { id, offerId, count } of items) {
                const value = ` (${id}, ${orderId}, ${campaignId}, '${offerId}', ${count},  ${getYDBTimestamp()})`
                values.push(value)
            }

            const driver = await getDriver()

            await driver.tableClient.withSession(async (session) => {
                await session.executeQuery(`${query} ${values.join(', ')}`)
                const instructions = await prepareInstructions(session)
                const {isFulfilled, codes, items} = await deliverOrder(session, orderId, instructions)
                //console.log('processing started', isFulfilled, items, codes)
                if(!isFulfilled) await sendProcessingStartedMessage(orderId, items, codes)
            })
            
            await driver.destroy()
            
            return reply

        }

        if(notificationType === 'ORDER_CREATED') {
            await sendOrderCreatedMessage(orderId)
            return reply
        }
        
        if(status === 'DELIVERED'){

            const driver = await getDriver()

            await driver.tableClient.withSession(async (session) => {
                await session.executeQuery(`update ordered_items set delivered_at = ${getYDBTimestamp()} where order_id = ${orderId}`)
            })

            await driver.destroy()

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
