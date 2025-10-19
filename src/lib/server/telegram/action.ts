import type { Context } from 'telegraf'
import  YDB from 'ydb-sdk'
import { deliverAll } from '../queries/delivery.js'
import { findUnfulfilled, getUnclosed, lackOfCodes } from '../queries/bot.js'

export const actionsFromDatabase = async (session: YDB.TableSession, data: string, ctx: Context, userId: number | string) => {

    switch(data){
        case 'deliver':
            await deliverAll(session, ctx)
            return
        case 'cancel':
            const ids = await getUnclosed(session)
            if(ids.length) await  findUnfulfilled(session, ctx) 
            else ctx.reply(`⏱️ Отправка заказов отложена.`)
            return
    }

    const [ _, action, orderId ] = /^([a-z]+)_(\d+)$/.exec(data) || []

    if(action === 'uf'){
            await lackOfCodes(session, orderId, ctx)
            return
    }
    
    throw `Команда не распознана.`
}
