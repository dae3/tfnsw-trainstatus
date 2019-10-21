resource "aws_lambda_function" "formatAlertForPush" {
  function_name = "${var.prefix}-${var.environment}-formatAlertForPush"
  handler       = "formatAlertForPush.handler"
  runtime       = "nodejs10.x"
  filename      = "dummy-lambda-handler.zip"
	timeout       = 180
  role          = aws_iam_role.formatAlertForPush.arn

  environment {
    variables = {
      TFNSW_PREFIX = "${var.prefix}"
      TFNSW_ENV = "${var.environment}"
    }
  }

  tags = local.common_tags
}

data "aws_iam_policy_document" "formatAlertForPush-assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "formatAlertForPush" {
  name               = "${var.prefix}-${var.environment}-formatAlertForPush"
  assume_role_policy = data.aws_iam_policy_document.formatAlertForPush-assume.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "formatAlertForPush_gtfs" {
  role       = aws_iam_role.formatAlertForPush.id
  policy_arn = aws_iam_policy.read_s3_gtfs.arn
}

resource "aws_iam_role_policy_attachment" "formatAlertForPush_logs" {
  role       = aws_iam_role.formatAlertForPush.id
  policy_arn = aws_iam_policy.cloudwatch_writelogs.arn
}

resource "aws_iam_role_policy_attachment" "formatAlertForPush_inputqueue" {
  role       = aws_iam_role.formatAlertForPush.id
  policy_arn = aws_iam_policy.consume_input_queue.arn
}

resource "aws_iam_role_policy_attachment" "formatAlertForPush_sns" {
  role       = aws_iam_role.formatAlertForPush.id
  policy_arn = aws_iam_policy.publish_notifications.arn
}

resource "aws_lambda_event_source_mapping" "queue_trigger" {
  event_source_arn = aws_sqs_queue.input_queue.arn
  function_name = aws_lambda_function.formatAlertForPush.arn
}

