import dotenv from 'dotenv'

export const getEnvironmentByName = (name: string): string => {
    let value = process.env[name]
    if(typeof value === 'string') return value
    dotenv.config()
    value = process.env[name]
    if(typeof value === 'string') return value
    throw 'no such environment'
}
