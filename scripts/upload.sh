#!/bin/bash

function upload {

    echo Uploading $1...

    mkdir -p ./build
    rm -rf   ./build/*
#    mkdir -p ./dist
#    rm -rf   ./dist/*

    source .env
    
    npx tsc --build tsconfig.json

    cp package.pure.json ./dist/package.json

    cd ./dist

    rm ../build/func.zip
    zip -r ../build/func.zip .

    cd ..

    yc serverless function version create \
      --runtime nodejs22 \
      --memory 256m \
      --execution-timeout 5s \
      --source-path ./build/func.zip \
      --service-account-id="$YC_ACCOUNT_ID" \
      --folder-id $YC_FOLDER_ID \
      --function-name="$1" \
      --entrypoint index.$1 \
      --environment "TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN_AS,TELEGRAM_CHANNEL=$TELEGRAM_CHANNEL,OAUTH_TOKEN=$OAUTH_TOKEN,YM_API_KEY=$YM_API_KEY,YC_DB_ENDPOINT=$YC_DB_ENDPOINT,YC_DB_PATH=$YC_DB_PATH,OAUTH_TOKEN=$OAUTH_TOKEN,YM_DELIVERY_TERM=$YM_DELIVERY_TERM"
}

#upload notification
#upload telegram

upload $1
