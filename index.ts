import { YC } from './src/lib/yc.js'
import { getOrder, sendProcessingStartedMessage, sendOrderCreatedMessage, sendMessage } from './src/lib/server/index.js'
import { getDriver } from './src/lib/server/ydb/driver-cjs.js'
import { getYDBTimestamp } from './src/lib/util.js'
import { Order } from './src/lib/index.js'

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

export async function handler(event: YC.CloudFunctionsHttpEvent, context: YC.CloudFunctionsHttpContext) {
    try {
        const { httpMethod } = event
        if(httpMethod.toLocaleLowerCase() !== 'post') throw 'Please use the POST method'

        let payload = context.getPayload()
        if(!(payload && typeof payload === 'object')) throw 'no object in payload'

        const { status, substatus, orderId, campaignId, createdAt, updatedAt, notificationType } = payload as Order

        if(notificationType === 'ORDER_CREATED') {
            await sendOrderCreatedMessage(orderId)
            return reply
        }

        if(status === 'PROCESSING' && substatus === 'STARTED'){

            const { order } = await getOrder(campaignId, orderId)
            const driver = await getDriver()
            const query = `insert into ordered_items (item_id, order_id, campaign_id, offer_id, count, created_at) values`
            
            const { items } = order
            const values = new Array<string>()
            for(const { id, offerId, count } of items) {
                const value = ` (${id}, ${orderId}, ${campaignId}, '${offerId}', ${count},  ${getYDBTimestamp()})`
                values.push(value)
            }

            await driver.tableClient.withSession(async (session) => {
                await session.executeQuery(`${query} ${values.join(', ')}`)
            })

            await driver.destroy()

            await sendProcessingStartedMessage(order)
            return reply
        }

        return reply

    }
    catch (err) {
        const body = `500: ${err}`
        await sendMessage(body)
        return {
            statusCode: 500,
            body: `500: ${err}`
        };
    }
}
