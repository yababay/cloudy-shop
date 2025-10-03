import { getDriver } from '../src/lib/server/ydb/driver'
import { OrderedItems } from '../src/lib/server/ydb/table'

const CREATE_TABLE = true
const TABLE_NAME = 'ordered_items'
  
;(async function(){

    const driver = await getDriver()

    await driver.tableClient.withSession(async (session) => {

        if(CREATE_TABLE) {
            await session.dropTable(TABLE_NAME)
            await session.createTable(TABLE_NAME, new OrderedItems())
        }

    })

    await driver.destroy()

})()
