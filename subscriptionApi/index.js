'use strict';
const aws = require('aws-sdk')
const sns = new aws.SNS( { region : 'ap-southeast-2' } )

exports.handler = (event, context, callback) => {
  const res = {
    statusCode : 200,
    headers : { "Content-Type" : "application/json" }
  };

  if (event.httpMethod === 'POST' && event.path === '/subscription') {
    let body;
    try { body = JSON.parse(event.body) }
    catch (err) { 
      if (typeof err == SyntaxError) {
        res.statusCode = 400
        callback(null, res)
      } else {
        throw err
      }
    }
    sns.subscribe({
      Protocol : body.targetType,
      TopicArn : `arn:aws:sns:ap-southeast-2:717350670811:${body.type}_${body.topic}`,
      Endpoint : body.target,
      ReturnSubscriptionArn : true
    }).promise()
      .then(data => { 
        res.body = JSON.stringify({
          type : body.type,
          topic : body.topic,
          targetType : body.targetType,
          target : body.target,
          id : data.SubscriptionArn
        })
        callback(null, res)
      })
      .catch(err => {
        res.statusCode = data.httpResponse.statusCode
        callback(null, res)
       })
  } else {
    res.statusCode = 404
    callback(null, res)
  }

}
