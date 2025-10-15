import { json } from "./server/index.js"

export const delivery = async () => {
    return json({hello: 'deploy'})
}
