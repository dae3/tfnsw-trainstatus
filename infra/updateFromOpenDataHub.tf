resource "aws_lambda_function" "updateFromOpenDataHub" {
  function_name = "${var.prefix}-${var.environment}-updateFromOpenDataHub"
  handler       = "updateFromOpenDataHub.handler"
  runtime       = "nodejs10.x"
  filename      = "dummy-lambda-handler.zip"
  timeout       = 300
  role          = aws_iam_role.updateFromOpenDataHub.arn

  tags = local.common_tags

  environment {
    variables = {
      "TFNSW_APIKEY" : "",
      "TFNSW_PREFIX" : "${var.prefix}",
      "TFNSW_ENV" : "${var.environment}"
    }
  }
}

data "aws_iam_policy_document" "updateFromOpenDataHub-assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "updateFromOpenDataHub" {
  name               = "${var.prefix}-${var.environment}-updateFromOpenDataHub"
  assume_role_policy = data.aws_iam_policy_document.updateFromOpenDataHub-assume.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "updateFromOpenDataHub_gtfs" {
  role       = aws_iam_role.updateFromOpenDataHub.id
  policy_arn = aws_iam_policy.update_s3_gtfs.arn
}

resource "aws_iam_role_policy_attachment" "updateFromOpenDataHub_logs" {
  role       = aws_iam_role.updateFromOpenDataHub.id
  policy_arn = aws_iam_policy.cloudwatch_writelogs.arn
}
