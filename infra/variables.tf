variable "region" {
  default = "ap-southeast-2"
}

variable "environment" {
  default = "dev"
}

variable "prefix" {
  default = "tfnsw"
}

locals {
  common_tags = {
    Product     = var.prefix
    Environment = var.environment
  }
}
