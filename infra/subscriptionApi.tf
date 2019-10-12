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

resource "aws_iam_role" "subscriptionApi" {
  name               = "${var.prefix}-${var.environment}-subscriptionApi"
  assume_role_policy = data.aws_iam_policy_document.subscriptionApi-assume.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "subscriptionApi_logs" {
  role       = aws_iam_role.subscriptionApi.id
  policy_arn = aws_iam_policy.cloudwatch_writelogs.arn
}

