resource "aws_iam_role_policy_attachment" "codebuild-s3" {
  role       = aws_iam_role.codebuild.name
  policy_arn = aws_iam_policy.update_s3_code.arn
}

resource "aws_iam_role_policy_attachment" "codebuild-logs" {
  role       = aws_iam_role.codebuild.name
  policy_arn = aws_iam_policy.cloudwatch_writelogs.arn
}
resource "aws_iam_role_policy_attachment" "codebuild" {
  role       = aws_iam_role.codebuild.name
  policy_arn = "arn:aws:iam::aws:policy/AWSCodeBuildDeveloperAccess"
}

data "aws_iam_policy_document" "codebuild-assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["codebuild.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "codebuild" {
  name = "${var.prefix}-codebuild" # not environment-specific

  assume_role_policy = data.aws_iam_policy_document.codebuild-assume.json
}

resource "aws_codebuild_project" "tfnsw-lambda-builder" {
  artifacts {
    type      = "S3"
    location  = aws_s3_bucket.code.bucket
    packaging = "ZIP"
  }

  environment {
    compute_type = "BUILD_GENERAL1_SMALL"
    image        = "aws/codebuild/standard:2.0"
    type         = "LINUX_CONTAINER"
  }

  name = "${var.prefix}-lambda_builder"

  source {
    type     = "S3"
    location = "${aws_s3_bucket.code.bucket}/source.zip"
  }

  logs_config {
    cloudwatch_logs {
      status     = "ENABLED"
      group_name = "${var.prefix}-aws_codebuild_project.tfnsw-lambda-builder.name"
    }
  }

  service_role = aws_iam_role.codebuild.arn
}
