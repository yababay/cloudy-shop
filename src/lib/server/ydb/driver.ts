import  YDB from 'ydb-sdk'
import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const { YC_DB_ENDPOINT, YC_DB_PATH, OAUTH_TOKEN } = process.env
if(!(YC_DB_ENDPOINT && YC_DB_PATH && OAUTH_TOKEN)) throw 'bad env'

let accessToken: string

const database = YC_DB_PATH
const endpoint = YC_DB_ENDPOINT

const {Driver, TokenAuthService} = YDB

const setupToken = async () => {
  const { data } = await axios.post('https://iam.api.cloud.yandex.net/iam/v1/tokens', {"yandexPassportOauthToken": OAUTH_TOKEN})
  const { iamToken } = data
  if(typeof iamToken !== 'string') throw 'bad iam token'
  accessToken = iamToken
  return data
}

export async function getDriver(local: boolean = true) {

  await setupToken()
  const authService = new TokenAuthService(accessToken)
  const driver = new Driver({endpoint, database, authService});
  const timeout = 10000;
  if (!await driver.ready(timeout)) {
    console.error(`Driver has not become ready in ${timeout}ms!`);
    process.exit(1);
  }

  return driver
}
