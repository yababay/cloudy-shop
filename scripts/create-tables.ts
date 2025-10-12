import { getDriver } from '../src/lib/server/db/driver'
import { createTables } from '../src/lib/server/db/models'
  
;(async function(){

    const driver = await getDriver()

    await driver.tableClient.withSession(async (session) => {

        await createTables(session)

    })
    await driver.destroy()

})()
