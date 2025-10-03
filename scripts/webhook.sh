#!/bin/bash

. .env

curl -X POST \
    -H 'Content-Type: application/json' \
    -d '{"url": "https://d5d8nis41336bq4vuh62.y1haggxy.apigw.yandexcloud.net/telegram"}' \
    https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN_AS/setWebhook