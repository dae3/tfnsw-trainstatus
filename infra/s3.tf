resource "aws_s3_bucket" "gtfs" {
  bucket       = "${var.prefix}-${var.environment}-gtfs"
  acl          = "private"
  force_destroy = true

  tags = local.common_tags
}

resource "aws_s3_bucket" "code" {
  bucket = "${var.prefix}-${var.environment}-code"
  acl    = "private"
  versioning { enabled = true }
  force_destroy = true

  tags = local.common_tags
}

resource "aws_s3_bucket_public_access_block" "gtfs" {
  bucket                  = aws_s3_bucket.gtfs.id
  block_public_acls       = true
  block_public_policy     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "code" {
  bucket                  = aws_s3_bucket.code.id
  block_public_acls       = true
  block_public_policy     = true
  restrict_public_buckets = true
}

data "aws_iam_policy_document" "update_s3_gtfs" {
  statement {
    actions = [
      "s3:DeleteObject",
      "s3:PutObject",
      "s3:GetObject",
    ]

    resources = [
      "arn:aws:s3:::${aws_s3_bucket.gtfs.bucket}/*"
    ]

  }
}

resource "aws_iam_policy" "update_s3_gtfs" {
  name   = "${var.prefix}-${var.environment}-update_s3_gtfs"
  policy = data.aws_iam_policy_document.update_s3_gtfs.json
}

data "aws_iam_policy_document" "read_s3_gtfs" {
  statement {
    actions = [
      "s3:GetObject",
    ]

    resources = [
      "arn:aws:s3:::${aws_s3_bucket.gtfs.bucket}/*"
    ]

  }
}

resource "aws_iam_policy" "read_s3_gtfs" {
  name   = "${var.prefix}-${var.environment}-read_s3_gtfs"
  policy = data.aws_iam_policy_document.read_s3_gtfs.json
}

data "aws_iam_policy_document" "update_s3_code" {
  statement {
    actions = [
      "s3:DeleteObject",
      "s3:PutObject",
      "s3:GetObject",
    ]

    resources = [
      "arn:aws:s3:::${aws_s3_bucket.code.bucket}/*"
    ]

  }
}

resource "aws_iam_policy" "update_s3_code" {
  name   = "${var.prefix}-${var.environment}-update_s3_code"
  policy = data.aws_iam_policy_document.update_s3_code.json
}
