import { getDriver } from '../src/lib/server/db/driver'
import { OrderedItems, Codes, Settings, getOffers, Offers } from '../src/lib/server/db/models'

const ORDERS_TABLE_NAME = 'ordered_items'
const CODES_TABLE_NAME = 'codes'
const SETTINGS_TABLE_NAME = 'settings'
const OFFERSS_TABLE_NAME = 'offers'
  
;(async function(){

    const driver = await getDriver()

    await driver.tableClient.withSession(async (session) => {

        await session.dropTable(ORDERS_TABLE_NAME)
        await session.createTable(ORDERS_TABLE_NAME, new OrderedItems())
        await session.dropTable(CODES_TABLE_NAME)
        await session.createTable(CODES_TABLE_NAME, new Codes())
        await session.dropTable(SETTINGS_TABLE_NAME)
        await session.createTable(SETTINGS_TABLE_NAME, new Settings())
        await session.dropTable(OFFERSS_TABLE_NAME)
        await session.createTable(OFFERSS_TABLE_NAME, new Offers())
        const values = getOffers().map(offer => `('APPLE${offer}')`).join(', ')
        const query = `upsert into ${OFFERSS_TABLE_NAME} (id) values ${values}`
        await session.executeQuery(query)
    })

    await driver.destroy()

})()
