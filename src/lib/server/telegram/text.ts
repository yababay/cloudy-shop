import { type Context } from "telegraf"

export const playnTextOutput = async (text: string, ctx: Context) => {

    switch(text) {
        case '/version':
            await ctx.reply('0.2.0')
            return true

        case '/start':
            await ctx.reply('🤖 Этот бот помогает заполнять коды для цифровых товаров компании Activation Service.\n\nВведите `/`, чтобы увидеть список доступных команд.', {parse_mode: 'Markdown'})
            return true
            
        case '/help':
            await ctx.reply('📖 Пользуйтесь командами меню (`/check`, `/codes` и др.) или вводите коды активации построчно, например\n\n `APPLE500 qwerty12345`\n`APPLE550 asdfgh67890`.', {parse_mode: 'Markdown'})
            return true
    }

    return false
}

/*
export const textFromDatabase = async (session: YDB.TableSession, text: string, ctx: Context, userId: number | string) => {

    if(text.startsWith('/remove')){
        const [ _, code] = text.split(/\s+/)
        if(!code) return await ctx.reply(`🤔 Не удалось распознать код для удаления.`)
        await session.executeQuery(`delete from codes where code = '${code}' where order_id is null`)
        const codes = await getCodes(session)
        ctx.reply(codes, {parse_mode: 'HTML'})
        return
    }
    
    switch(text) {

        case '/codes':
            ctx.reply(await getCodes(session), {parse_mode: 'HTML'})
            return

        case '/check':
            await findUnfulfilled(session, ctx)
            return

        case '/deliver':
        case '/delivery':
            const ids = await getUnclosed(session)
            if(ids.length) await ctx.reply('Отправить незаполненные заказы?', {parse_mode: 'HTML', ...Markup.inlineKeyboard([
                [
                    Markup.button.callback('📤 отравить', `deliver`),
                    Markup.button.callback('🛑 не отравлять', `cancel`),
                ]
            ])})
            else await ctx.reply(`🤔 Неотправленных заказов пока нет.`)
            return
    }

    const offers = await stringsFromQuery(session, `select id from offers`)

    let codes = text.trim()
        .split(/[\r\n]+/)
        .map(row => row.split(/\s+/))
    
    let { length } = codes

    codes = codes.filter(arr => arr.length === 2 &&  offers.includes(arr[0]))

    if(!codes.length) throw `Не удалось распознать коды в тексте: ${text}.`

    let success = 0
                
    for(const [offer, code] of codes) {
        if(!isEmpty(await session.executeQuery(`select code from codes where code = '${code}'`))) continue
        await session.executeQuery(`insert into codes (offer_id, code, created_at, user) values ('${offer}', '${code}', ${getYDBTimestamp()}, ${userId})`)
        success++
    }

    if(!success) throw 'Не удалось добавить ни одного кода. Возможно, они уже занесены в базу данных.'

    let message = success === length ? `📑 Все строки успешно обработаны.` : `📑 Успешно обработано ${success} строк из ${length}.`
    
    const ids = await getUnclosed(session)
    
    if(!ids.length) return await ctx.reply(message)
    
    message += `\n\n${unsufficientOrders}`

    await ctx.reply(message, orderButtons(ids))
}
*/
