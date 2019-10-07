# no actual resource for SNS, it's created by creating topics
# which in turn is handled programmatically within the solution
#
locals {
  all_sns_resources = [
    "arn:aws:sns:${var.region}:${data.aws_arn.account_id.account}:route_*",
    "arn:aws:sns:${var.region}:${data.aws_arn.account_id.account}:trip_*",
    "arn:aws:sns:${var.region}:${data.aws_arn.account_id.account}:stop_*"
  ]
}

data "aws_iam_policy_document" "update_notificationtopics" {
  statement {
    actions = [
      "sns:GetTopicAttributes",
      "sns:DeleteTopic",
      "sns:CreateTopic",
      "sns:ListTopics",
      "sns:SetTopicAttributes"
    ]
    resources = local.all_sns_resources
  }
}

resource "aws_iam_policy" "update_notificationtopics" {
  name        = "${var.prefix}-${var.environment}-update_notificationtopics"
  description = "Maintain the SNS topics"
  policy      = data.aws_iam_policy_document.update_notificationtopics.json
}

data "aws_iam_policy_document" "list_subscriptions" {
  statement {
    actions   = ["sns:ListSubscriptions"]
    resources = local.all_sns_resources
  }
}

resource "aws_iam_policy" "list_subscriptions" {
  name        = "${var.prefix}-${var.environment}-list_subscriptions"
  description = "List all subscriptions"
  policy      = data.aws_iam_policy_document.list_subscriptions.json
}

data "aws_iam_policy_document" "publish_notifications" {
  statement {
    actions   = ["sns:Publish"]
    resources = local.all_sns_resources
  }
}

resource "aws_iam_policy" "publish_notifications" {
  name   = "${var.prefix}-${var.environment}-publish_notifications"
  policy = data.aws_iam_policy_document.publish_notifications.json
}

data "aws_iam_policy_document" "subscribe_unsubscribe" {
  statement {
    actions = [
      "sns:Subscribe",
      "sns:ConfirmSubscription",
      "sns:SetSubscriptionAttributes",
      "sns:Unsubscribe"
    ]
    resources = local.all_sns_resources
  }
}

resource "aws_iam_policy" "subscribe-unsubscribe" {
  name   = "${var.prefix}-${var.environment}-subscribe_unsubscribe"
  policy = data.aws_iam_policy_document.subscribe_unsubscribe.json
}
