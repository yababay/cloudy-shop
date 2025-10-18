import  YDB from 'ydb-sdk'
import { stringsFromQuery } from '../ydb/util.js'
import { apiPrefixV2 } from '../yandex.js'
import { putWithToken, text } from '../net.js'
import { getDriver } from '../ydb/driver.js'
import { sendStocksMessage } from '../telegram/index.js'

const { YM_CAMPAIGN_ID } = process.env

if(typeof YM_CAMPAIGN_ID !== 'string') throw `YM_CAMPAIGN_ID is not a string: ${JSON.stringify(YM_CAMPAIGN_ID)}`

const pseudo = 50

const variate = () => {
    const p = +pseudo
    if(p <= 1) return p
    const base = Math.ceil(p / 2)
    const salt = Math.round(Math.random() * base)
    return base + salt
}

function toISOStringWithTimezone(date: Date) {
    const tzOffset = -date.getTimezoneOffset(); // Get offset in minutes and reverse sign
    const diff = tzOffset >= 0 ? "+" : "-"; // Determine sign for offset
    const pad = (n: number) => `${Math.floor(Math.abs(n))}`.padStart(2, "0"); // Helper for padding
  
    return (
      date.getFullYear() +
      "-" +
      pad(date.getMonth() + 1) +
      "-" +
      pad(date.getDate()) +
      "T" +
      pad(date.getHours()) +
      ":" +
      pad(date.getMinutes()) +
      ":" +
      pad(date.getSeconds()) +
      diff +
      pad(tzOffset / 60) +
      ":" +
      pad(tzOffset % 60)
    );
  }

export const stocks = async () => {

  const driver = await getDriver()

  const ok = await driver.tableClient.withSession(async (session) => {
    const arr = await stringsFromQuery(session, `select id from offers`) //(string | number)[][] = await getStocks()
    const url = `${apiPrefixV2}/campaigns/${YM_CAMPAIGN_ID}/offers/stocks`
    const date = new Date()
    let minutes = date.getMinutes()
    minutes -= 1
    date.setMinutes(minutes)
    const updatedAt = toISOStringWithTimezone(date)
    const skus = arr.map(sku => {
        const items = [{count: variate(), updatedAt}]
        return { sku, items }
    })
    console.log(url, JSON.stringify(skus.slice(0, 5)))
    const data = await putWithToken(url, { skus })
    const { status } = data
    return status && status === 'OK'
  })

  await driver.destroy()
  
  await sendStocksMessage(ok)

  return text('Обновление остатков прошло успешно.')
}
