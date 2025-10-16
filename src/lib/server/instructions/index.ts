import  YDB from 'ydb-sdk'
import { rowsFromResult, stringFromItem } from '../ydb/util.js'
import ACTIVATION_INSTRUCTION from './ACTIVATION.md?raw'
import HOLIDAY_INSTRUCTION from './HOLIDAY.md?raw'
import CHAT_FIRST_MESSAGE from './CHAT.md?raw'

export const INSTRUCTIONS = [ACTIVATION_INSTRUCTION, HOLIDAY_INSTRUCTION, CHAT_FIRST_MESSAGE] 

export const prepareInstruction = async (session: YDB.TableSession, chatUrl = '') => {

    const result = await session.executeQuery(`select key, value from settings`)

    const settings = new Map<string, string>(rowsFromResult(result).map(({items}) => {
        const [ key, value ] = items || []
        return [ stringFromItem(key), stringFromItem(value)  ]
    }))

    const OPENING_HOURS_FROM = settings.get('OPENING_HOURS_FROM')
    const OPENING_HOURS_TO = settings.get('OPENING_HOURS_TO')
    const ACTIVATION_INSTRUCTION = settings.get('ACTIVATION_INSTRUCTION')
    const HOLIDAY_INSTRUCTION = settings.get('HOLIDAY_INSTRUCTION') 
    const CHAT_FIRST_MESSAGE = settings.get('CHAT_FIRST_MESSAGE')
    const FAKE_CODE = settings.get('FAKE_CODE')

    if(!(ACTIVATION_INSTRUCTION && HOLIDAY_INSTRUCTION && CHAT_FIRST_MESSAGE && FAKE_CODE && OPENING_HOURS_FROM && OPENING_HOURS_TO)) throw 'bad settings'

    return [ACTIVATION_INSTRUCTION, HOLIDAY_INSTRUCTION, CHAT_FIRST_MESSAGE, FAKE_CODE].map(instr => instr
        .replaceAll('OPENING_HOURS_FROM', OPENING_HOURS_FROM)
        .replaceAll('OPENING_HOURS_TO', OPENING_HOURS_TO)
        .replaceAll('CHAT_URL', chatUrl))
}
  