import { getDriver } from '../dist/server/ydb/driver.js'
import { getUnfilled } from '../dist/server/queryes/unfilled.js'

;(async function(){

    
    const previous = new Date()
    let mins = previous.getMinutes()
    mins -= 25
    previous.setMinutes(mins)
    
    const driver = await getDriver()

    await driver.tableClient.withSession(async (session) => {
        const result = await getUnfilled(session)
        console.log('result', result.filter(({ts}) => ts.getTime() < previous.getTime()))
    })

    await driver.destroy()

})()
