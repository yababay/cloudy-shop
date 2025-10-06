import { YC } from './src/lib/yc.js'
import { getOrder, sendProcessingStartedMessage, sendOrderCreatedMessage, sendMessage } from './src/lib/server/index.js'
import { getDriver } from './src/lib/server/db/driver-cjs.js'
import { getYDBTimestamp, intFromQuery, isEmpty, rowsFromResultSets, stringFromRows } from './src/lib/server/db/util.js'
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

        const { status, substatus, orderId, campaignId, notificationType } = payload as Order

        if(notificationType === 'ORDER_CREATED') {
            await sendOrderCreatedMessage(orderId)
            return reply
        }

        if(status === 'PROCESSING' && substatus === 'STARTED'){

            const { order } = await getOrder(campaignId, orderId)

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

                const offers = items.reduce((acc, { offerId, count }) => {
                    const arr = new Array<string>(count).fill(offerId)
                    return [ ...acc, ...arr ]
                }, new Array<string>())
                  
                const ts = getYDBTimestamp()
                const failed = new Set<string>()
                
                let count = 0
                
                for(const offer of offers) {
                      if(failed.has(offer)) continue
                      const result = await session.executeQuery(`select code from codes where offer_id = '${offer}' and order_id is null limit 1`)
                      if(isEmpty(result)){
                        failed.add(offer)
                        continue
                      }
                      count++
                      const rows = rowsFromResultSets(result)
                      let code = stringFromRows(rows) 
                      await session.executeQuery(`update codes set order_id = ${orderId}, updated_at = ${ts} where code = '${code}'`)
                }
                
                const sum = await intFromQuery(session, `select sum(amount) from ordered_items where order_id = ${orderId}`)
                await sendProcessingStartedMessage(order, sum, count)
            })

            await driver.destroy()

            return reply
        }

        return reply

    }
    catch (err) {
        const body = `500: ${err}`
        await sendMessage(body)
        return {
            statusCode: 500,
            body
        };
    }
}

