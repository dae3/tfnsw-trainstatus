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

# Directly attach permission for lambda invocation from API gateway
resource "aws_lambda_permission" "subscriptionApi-apigw" {
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.subscriptionApi.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "arn:aws:execute-api:${var.region}:${data.aws_arn.account_id.account}:${aws_api_gateway_rest_api.subscription.id}/*/${aws_api_gateway_method.get_subscription.http_method}${aws_api_gateway_resource.subscription.path}"
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

