# API gateway global settings
resource aws_api_gateway_account "apigateway" {
  cloudwatch_role_arn = aws_iam_role.apigateway.arn
}

data aws_iam_policy_document "apigateway-cloudwatch" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["apigateway.amazonaws.com"]
    }
  }
}

data aws_iam_policy_document "apigateway_cloudwatch_writelogs" {
  statement {
    actions = [
      "logs:CreateLogGroup",
      "logs:CreateLogStream",
      "logs:DescribeLogGroups",
      "logs:DescribeLogStreams",
      "logs:FilterLogEvents",
      "logs:GetLogEvents",
      "logs:PutLogEvents",
    ]
    resources = ["arn:aws:logs:${var.region}:${data.aws_arn.account_id.account}:*"]
  }
}

resource aws_iam_policy "apigateway_cloudwatch_writelogs" {
  name = "apigateway_cloudwatch_writelogs"
  policy = data.aws_iam_policy_document.apigateway_cloudwatch_writelogs.json
}

resource aws_iam_role "apigateway" {
  name               = "apigateway-cloudwatch"
  assume_role_policy = data.aws_iam_policy_document.apigateway-cloudwatch.json
}

resource aws_iam_role_policy_attachment "apigateway-cloudwatch" {
  role       = aws_iam_role.apigateway.id
  policy_arn = aws_iam_policy.apigateway_cloudwatch_writelogs.arn
}

# The actual API gateway
resource "aws_lambda_function" "subscriptionApi" {
  function_name = "${var.prefix}-${var.environment}-subscriptionApi"
  handler       = "subscriptionApi.handler"
  runtime       = "nodejs10.x"
  filename      = "dummy-lambda-handler.zip"
  role          = aws_iam_role.subscriptionApi.arn

  tags = local.common_tags
}

data "aws_iam_policy_document" "subscriptionApi-assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

# Stage, key, usage plan
resource aws_api_gateway_deployment "subscription" {
  #depends_on = [ aws_api_gateway_integration.subscription ]
  rest_api_id = aws_api_gateway_rest_api.subscription.id
}

resource "aws_api_gateway_stage" "subscription" {
  stage_name    = "${var.environment}"
  rest_api_id   = aws_api_gateway_rest_api.subscription.id
  deployment_id = aws_api_gateway_deployment.subscription.id
}

resource aws_api_gateway_api_key "subscription" {
  name = "${var.prefix}-${var.environment}"
}

resource aws_api_gateway_usage_plan "subscription" {
  name        = "${var.prefix}-${var.environment}"
  description = "${var.prefix}-${var.environment}"
  api_stages {
    api_id = aws_api_gateway_rest_api.subscription.id
    stage  = aws_api_gateway_stage.subscription.stage_name
  }
}

resource aws_api_gateway_usage_plan_key "subscription" {
  key_id        = aws_api_gateway_api_key.subscription.id
  key_type      = "API_KEY"
  usage_plan_id = aws_api_gateway_usage_plan.subscription.id
}

# Directly attach permissions for lambda invocation from API gateway
resource "aws_lambda_permission" "subscriptionApi-apigw-get" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.subscriptionApi.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.region}:${data.aws_arn.account_id.account}:${aws_api_gateway_rest_api.subscription.id}/*/${aws_api_gateway_method.get_subscription.http_method}${aws_api_gateway_resource.subscription.path}"
}

resource "aws_lambda_permission" "subscriptionApi-apigw-post" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.subscriptionApi.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.region}:${data.aws_arn.account_id.account}:${aws_api_gateway_rest_api.subscription.id}/*/${aws_api_gateway_method.post_subscription.http_method}${aws_api_gateway_resource.subscription.path}"
}

resource "aws_iam_role" "subscriptionApi" {
  name               = "${var.prefix}-${var.environment}-subscriptionApi"
  assume_role_policy = data.aws_iam_policy_document.subscriptionApi-assume.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "subscriptionApi_logs" {
  role       = aws_iam_role.subscriptionApi.id
  policy_arn = aws_iam_policy.cloudwatch_writelogs.arn
}

resource "aws_iam_role_policy_attachment" "subscriptionApi_sns" {
  role       = aws_iam_role.subscriptionApi.id
  policy_arn = aws_iam_policy.list_subscriptions.arn
}

