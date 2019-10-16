resource "aws_cloudwatch_log_group" "update" {
  name = "/${var.prefix}/${var.environment}/update"

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "poller" {
  name = "/${var.prefix}/${var.environment}/poller"

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "api" {
  name = "/${var.prefix}/${var.environment}/api"

  tags = local.common_tags
}

data "aws_iam_policy_document" "cloudwatch_writelogs" {
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
    resources = ["arn:aws:logs:${var.region}:${data.aws_arn.account_id.account}:/${var.prefix}/*"]
  }
}

resource "aws_iam_policy" "cloudwatch_writelogs" {
  name   = "${var.prefix}-${var.environment}-cloudwatch_writelogs"
  policy = data.aws_iam_policy_document.cloudwatch_writelogs.json
}
