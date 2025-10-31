import { type Context } from "telegraf"

export const plainTextOutput = async (text: string, ctx: Context) => {

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
