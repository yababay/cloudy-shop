import axios from 'axios'
import { Driver } from '@ydbjs/core'
import { AccessTokenCredentialsProvider } from '@ydbjs/auth/access-token'
import { getEnvironmentByName } from '$lib/util/env.js'

const YC_DB_ENDPOINT = getEnvironmentByName('YC_DB_ENDPOINT')
const YC_DB_PATH = getEnvironmentByName('YC_DB_PATH')
const OAUTH_TOKEN = getEnvironmentByName('OAUTH_TOKEN')

const getToken = async () => {
    const { data } = await axios.post('https://iam.api.cloud.yandex.net/iam/v1/tokens', {"yandexPassportOauthToken": OAUTH_TOKEN})
    const { iamToken } = data
    if(typeof iamToken !== 'string') throw 'bad iam token'
    return iamToken
}

export const getRemoteDriver = async () => {
    const token = await getToken()
    const credentialsProvider = new AccessTokenCredentialsProvider({ token })
    return await getDriver(YC_DB_ENDPOINT, YC_DB_PATH, {credentialsProvider})
}

export async function getDriver(entryPoint = 'grpc://localhost:2136', dbName = '/Root/test', options?: {credentialsProvider: any }) {
    const driver = options ? new Driver(`${entryPoint}${dbName}`, options) : new Driver(`${entryPoint}${dbName}`)
    await driver.ready()
    return driver
}
