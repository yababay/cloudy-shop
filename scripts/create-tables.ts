import { getDriver } from '../src/lib/server/db/driver'
import { OrderedItems, Codes, Settings } from '../src/lib/server/db/models'

const CREATE_TABLE = true
const ORDERS_TABLE_NAME = 'ordered_items'
const CODES_TABLE_NAME = 'codes'
const SETTINGS_TABLE_NAME = 'settings'
  
;(async function(){

    const driver = await getDriver()

    await driver.tableClient.withSession(async (session) => {

        if(CREATE_TABLE) {
            await session.dropTable(ORDERS_TABLE_NAME)
            await session.createTable(ORDERS_TABLE_NAME, new OrderedItems())
            await session.dropTable(CODES_TABLE_NAME)
            await session.createTable(CODES_TABLE_NAME, new Codes())
            await session.dropTable(SETTINGS_TABLE_NAME)
            await session.createTable(SETTINGS_TABLE_NAME, new Settings())
        }
    })

    await driver.destroy()

})()
