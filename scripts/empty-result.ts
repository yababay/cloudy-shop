import { getDriver } from '../src/lib/server/db/driver'
import { OrderedItems, Codes } from '../src/lib/server/db/models'

;(async function(){

    const driver = await getDriver()

    await driver.tableClient.withSession(async (session) => {
        const result = await session.executeQuery("select code from codes where offer_id = 'APPLE500'")
        console.log('result', result)
    })
    await driver.destroy()

})()
