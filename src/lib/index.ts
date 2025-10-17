import { delivery } from './server/index.js'

export {
    delivery
}

/*import { sendDeliveryMessage, sendErrorMessage, getUnfilled, tryToFulfill, getDriver, text } from "./server/index.js"

export const delivery = async () => {

    const driver = await getDriver()

    const processed = await driver.tableClient.withSession(async (session) => {
        const oids = await getUnfilled(session)
        const previous = new Date()
        let mins = previous.getMinutes()
        mins -= 20
        previous.setMinutes(mins)
        const ok = new Array<number>()
        for(const {id, ts} of oids) {
            // if(ts.getTime() > previous.getTime()) continue // too young
            try {
                const { chat } = await tryToFulfill(session, id, true)
                await sendDeliveryMessage(id, chat)
            }
            catch(err){
                console.log('delivery error', err)
                await sendErrorMessage(id, err)
            }
            ok.push(id)
        }
        return ok
    })

    await driver.destroy()

    let message = `Необработанных заказов не обнаружено.`

    if(processed.length){
        const plural = processed.length > 1
        const ending = plural && 'ы' || ''
        message = `Обработан${ending} заказ${ending} ${plural ? '№№' : '№'} ${processed.join(', ')}.`
    }

    console.log(message)
    
    return text(message)
}
*/
