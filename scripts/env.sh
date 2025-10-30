#!/bin/bash

export YC_DB_ENDPOINT=`cat .env | egrep -o 'grpc.*$'`
export YC_DB_PATH=`cat .env | egrep -o '/ru-central.*$'`
export OAUTH_TOKEN=`cat .env | egrep -o 'y0_.*$'`
export YM_API_KEY=`cat .env | egrep -o 'ACMA.*$'`
