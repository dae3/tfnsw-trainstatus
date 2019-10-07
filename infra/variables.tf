variable "region" {
  default = "ap-southeast-2"
}

variable "environment" {
  default = "dev"
}

variable "prefix" {
  default = "tfnsw"
}

data "aws_caller_identity" "main" {}
data "aws_arn" "account_id" {
  arn = data.aws_caller_identity.main.arn
}

locals {
  common_tags = {
    Product     = var.prefix
    Environment = var.environment
  }
}
