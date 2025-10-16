import { getDriver, json } from "./server/index.js"
import { getUnfilled } from "./server/queryes/fulfill.js"

export const delivery = async () => {

    const driver = await getDriver()

    let length = -1
    await driver.tableClient.withSession(async (session) => {
        const rows = await getUnfilled(session)
        length = rows?.length || -2
    })

    await driver.destroy()

    return json({unfilled: length})
}
