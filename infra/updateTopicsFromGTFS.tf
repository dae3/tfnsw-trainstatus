resource "aws_lambda_function" "updateTopicsFromGTFS" {
  function_name = "${var.prefix}-${var.environment}-updateTopicsFromGTFS"
  handler       = "updateTopicsFromGTFS.handler"
  runtime       = "nodejs10.x"
  filename      = "dummy-lambda-handler.zip"
  role          = aws_iam_role.updateTopicsFromGTFS.arn

  tags = local.common_tags
}

data "aws_iam_policy_document" "updateTopicsFromGTFS-assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["lambda.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "updateTopicsFromGTFS" {
  name               = "${var.prefix}-${var.environment}-updateTopicsFromGTFS"
  assume_role_policy = data.aws_iam_policy_document.updateTopicsFromGTFS-assume.json

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "updateTopicsFromGTFS_gtfs" {
  role       = aws_iam_role.updateTopicsFromGTFS.id
  policy_arn = aws_iam_policy.read_s3_gtfs.arn
}

resource "aws_iam_role_policy_attachment" "updateTopicsFromGTFS_logs" {
  role       = aws_iam_role.updateTopicsFromGTFS.id
  policy_arn = aws_iam_policy.cloudwatch_writelogs.arn
}

resource "aws_iam_role_policy_attachment" "updateTopicsFromGTFS_sns" {
  role       = aws_iam_role.updateTopicsFromGTFS.id
  policy_arn = aws_iam_policy.update_notificationtopics.arn
}
