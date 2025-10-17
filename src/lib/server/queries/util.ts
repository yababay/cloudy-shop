import  YDB from 'ydb-sdk'
import { intFromQuery } from '../ydb/util.js'

export const compaignByOrder = async (session: YDB.TableSession, orderId: number | string) => {
    return await intFromQuery(session, `select distinct campaign_id from ordered_items where order_id = ${orderId}`)
}
