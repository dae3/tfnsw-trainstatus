# TFNSW IAM design

## Entities

- S3
  - Code
  - GTFS data
- Lambdas
  - formatAlertForPush
  - updateFromOpenDataHub
  - updateTopicsFromGTFS
- CloudWatch
- SQS
  - Input queue
- SNS
- CodeBuild?

## Roles
- Build and deploy
- Run

## RBAC matrix

| Permissions             | Build and deploy | EC2 Run | FAFP lambda | UfOD lambda | UTfG lambda |
|-------------------------|------------------|---------|-------------|-------------|-------------|
| Read S3 code            | X                |         |             |             |             |
| Write S3 code           | x                |         |             |             |             |
| Read S3 GTFS data       |                  |         | x           |             |             |
| Write S3 GTFS data      |                  |         |             | x           |             |
| Update Lambdas          | X                |         |             |             |             |
| Write to CloudWatch     | x                | X       | x           | x           | x           |
| Write to input queue    |                  | X       |             |             |             |
| Read from input queue   |                  |         | x           |             |             |
| Remove from input queue |                  |         | x           |             |             |
| Write to SNS            |                  |         | x           |             |             |
