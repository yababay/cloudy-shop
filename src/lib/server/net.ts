import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const { YM_API_KEY } = process.env

if(!YM_API_KEY) throw 'no yandex token'

const apiKey: string = YM_API_KEY

export const headers = { 'Api-Key': apiKey }

export const getWithToken = async (url: string) => {
    const { data } = await axios.get(url, { headers })
    return data
}

export const postWithToken = async (url: string, body: object) => {
    const { data } = await axios.post(url, body, { headers })
    return data
}

const NOTIFICATION_OK = {
    name: "shop",
    time: new Date().toISOString(),
    version: "1.0.0"
}

export const text = (body: string) => ({
    statusCode: 200,
    body,
    'headers': {
        'Content-Type': 'text/plain',
    },
    isBase64Encoded: false
})

export const json = (body: {[key: string]: string | number}) => ({
    statusCode: 200,
    body: JSON.stringify(body),
    'headers': {
        'Content-Type': 'application/json',
    },
    isBase64Encoded: false
})

export const notificationOk = json(NOTIFICATION_OK)
