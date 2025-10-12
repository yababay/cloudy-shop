import { ResultSet } from 'ydb-sdk';
import { getDriver } from '../src/lib/server/db/driver'
import { intFromResult } from '../src/lib/server/db/util'

;(async function(){

    const driver = await getDriver()

    await driver.tableClient.withSession(async (session) => {
        const queries = ['APPLE500', 'APPLE5050', 'APPLE5000'].map(offer => `select count(*) from codes where offer_id = '${offer}'`).join('; ')
        console.log(queries)
        const { resultSets } = await session.executeQuery(queries)
        console.log('results', resultSets.map(rs => {
            const { rows } = rs
            if(!(Array.isArray(rows) && rows?.length)) throw 'no rows'
            const [ row ] = rows
            const { items } = row
            if(!(Array.isArray(rows) && items?.length)) throw 'no rows'
            const [ item ] = items
            let { uint64Value } = item
            if(!uint64Value) throw 'bad uint64'
            if(typeof uint64Value !== 'number') uint64Value = uint64Value.low
            return uint64Value
        }))
    })
    await driver.destroy()

})()
