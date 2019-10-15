resource "aws_api_gateway_rest_api" "subscription" {
  # API gateway is environment independent, stages are per-environment
  name = "${var.prefix}-subscription"

  endpoint_configuration {
    types = ["REGIONAL"]
  }

}

# models
resource "aws_api_gateway_model" "subscriptiontype" {
  rest_api_id  = aws_api_gateway_rest_api.subscription.id
  name         = "SubscriptionType"
  content_type = "application/json"
  schema       = file("../subscriptionApi/api/SubscriptionType.json")
}

resource "aws_api_gateway_model" "subscription" {
  rest_api_id  = aws_api_gateway_rest_api.subscription.id
  name         = "Subscription"
  content_type = "application/json"
  schema       = templatefile("../subscriptionApi/api/Subscription.json", { api_id = aws_api_gateway_rest_api.subscription.id })
  depends_on   = [aws_api_gateway_model.subscriptiontype]
}

resource "aws_api_gateway_model" "subscriptionlist" {
  rest_api_id  = aws_api_gateway_rest_api.subscription.id
  name         = "SubscriptionList"
  content_type = "application/json"
  schema       = templatefile("../subscriptionApi/api/SubscriptionList.json", { api_id = aws_api_gateway_rest_api.subscription.id })
  depends_on   = [aws_api_gateway_model.subscriptiontype]
}

resource "aws_api_gateway_model" "newsubscription" {
  rest_api_id  = aws_api_gateway_rest_api.subscription.id
  name         = "NewSubscription"
  content_type = "application/json"
  schema       = templatefile("../subscriptionApi/api/NewSubscription.json", { api_id = aws_api_gateway_rest_api.subscription.id })
  depends_on   = [aws_api_gateway_model.subscriptiontype]
}

# resources and methods
resource "aws_api_gateway_resource" "subscription" {
  rest_api_id = aws_api_gateway_rest_api.subscription.id
  parent_id   = aws_api_gateway_rest_api.subscription.root_resource_id
  path_part   = "subscription"
}

resource "aws_api_gateway_method" "get_subscription" {
  rest_api_id   = aws_api_gateway_rest_api.subscription.id
  resource_id   = aws_api_gateway_resource.subscription.id
  http_method   = "GET"
  authorization = "NONE"
}

# resource-method integration to implementations
resource "aws_api_gateway_integration" "get_subscription" {
  rest_api_id = aws_api_gateway_rest_api.subscription.id
  resource_id = aws_api_gateway_resource.subscription.id
  http_method = aws_api_gateway_method.get_subscription.http_method

  integration_http_method = "POST"
  type                    = "AWS_PROXY"
  uri                     = aws_lambda_function.subscriptionApi.invoke_arn
}

resource "aws_api_gateway_integration_response" "get_subscription_200" {
  rest_api_id = aws_api_gateway_rest_api.subscription.id
  resource_id = aws_api_gateway_resource.subscription.id
  http_method = aws_api_gateway_method.get_subscription.http_method
  status_code = 200

}


resource "aws_api_gateway_method_response" "get_subscription_200" {
  rest_api_id = aws_api_gateway_rest_api.subscription.id
  resource_id = aws_api_gateway_resource.subscription.id
  http_method = aws_api_gateway_method.get_subscription.http_method
  status_code = 200
  response_models = { "application/json" = "${aws_api_gateway_model.subscriptionlist.name}" }
}

