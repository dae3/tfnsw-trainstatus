
resource "aws_sqs_queue" "input_queue" {
  name                      = "${var.prefix}-${var.environment}-input_queue"
  delay_seconds             = 0
  max_message_size          = 256000
  message_retention_seconds = 86400
  receive_wait_time_seconds = 0

  tags = local.common_tags
}

data "aws_iam_policy_document" "input_queue" {
  statement {
    actions = [
      "sqs:GetQueueUrl",
      "sqs:ListDeadLetterSourceQueues",
      "sqs:SendMessageBatch",
      "sqs:ReceiveMessage",
      "sqs:SendMessage",
      "sqs:GetQueueAttributes",
      "sqs:ListQueueTags"
    ]
    resources = [
      aws_sqs_queue.input_queue.arn
    ]
  }
}

resource "aws_iam_policy" "input_queue" {
  name        = "${var.prefix}-${var.environment}-publish_to_input_queue"
  description = "Allow publishing of alerts to the input queue"
  policy      = data.aws_iam_policy_document.input_queue.json
}
