#!/bin/sh

docker run \
  -it \
  --rm \
  -v $(pwd):/var/task:ro,delegated \
  -e DOCKER_LAMBDA_STAY_OPEN=1 \
  -e DOCKER_LAMBDA_WATCH=1 \
  -e AWS_ACCESS_KEY_ID \
  -e AWS_SECRET_ACCESS_KEY \
  -e AWS_REGION=ap-southeast-2 \
  -p 9001:9001 \
  lambci/lambda:nodejs10.x \
  subscriptionapi.handler
