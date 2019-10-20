resource aws_secretsmanager_secret "tfnsw_apikey" {
	name = "${var.prefix}-${var.environment}-tfnsw_apikey"
}

data aws_iam_policy_document "tfnsw_apikey_read" {
	statement {
		actions = [
			"secretsmanager:GetSecretValue"
		]
		effect = "Allow"
		resources = [ aws_secretsmanager_secret_version.current.arn ]
	}
}

resource aws_iam_policy "tfnsw_apikey_read" {
	name = "${var.prefix}-${var.environment}-tfnsw_apikey_read"
	policy = data.aws_iam_policy_document.tfnsw_apikey_read.json
}

resource aws_secretsmanager_secret_version "current" {
	secret_id = aws_secretsmanager_secret.tfnsw_apikey.id
	secret_string = chomp(file("../apikey"))
}
