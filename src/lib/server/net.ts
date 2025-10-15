const NOTIFICATION_OK = {
    name: "shop",
    time: new Date().toISOString(),
    version: "1.0.0"
}

export const json = (body: {[key: string]: string}) => ({
    statusCode: 200,
    body: JSON.stringify(body),
    'headers': {
        'Content-Type': 'application/json',
    },
    isBase64Encoded: false
})

export const notificationOk = json(NOTIFICATION_OK)
