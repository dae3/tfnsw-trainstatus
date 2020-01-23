'use strict';
const aws = require('aws-sdk')
const sns = new aws.SNS( { region : 'ap-southeast-2' } )
// const { stringify, print } = require('q-i');

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
        callback(err)
      }
    }
    sns.subscribe({
      Protocol : body.targetType,
      TopicArn : `arn:aws:sns:ap-southeast-2:717350670811:${body.type}_${body.topic}`,
      Endpoint : body.target,
      ReturnSubscriptionArn : true
    }).promise()
      .then((data) => { 
        res.body = JSON.stringify({
          type : body.type,
          topic : body.topic,
          targetType : body.targetType,
          target : body.target,
          id : data.SubscriptionArn
        })
        callback(null, res)
      })
      .catch((err) => {
        res.statusCode = err.statusCode
        res.headers['Content-Type'] = 'text/plain'
        res.body = err.message
        callback(null, res)
      })
  } else if (event.httpMethod === 'GET' && event.path === '/subscription') {
    listSubscriptions(sns).then((subs) => {
      res.body = JSON.stringify(subs.map( s => {
        const arnParts = s.TopicArn.split(':');
        const topicParts = arnParts[5].split('_');

        return {
          type : s.Protocol,
          id: s.SubscriptionArn.split(':')[6],
          topicType : topicParts[0],
          topic : `${topicParts[1]}_${topicParts[2]}`
        }

      }))
      callback(null, res)
    })
      .catch(err => {
        res.statusCode = err.statusCode
        res.body = err.message
        res.headers['Content-Type'] = 'text/plain'
        callback(null, res)
      })
  } else {
    res.statusCode = 404
    callback(null, res)
  }
}

function listSubscriptions(sns, nextToken = "") {
  return new Promise((resolve, reject) => {
    sns.listSubscriptions({ NextToken : nextToken }).promise()
      .then((data) => {
        if (data.NextToken) {
          listSubscriptions(sns, data.NextToken)
            .then((recdata) => resolve(data.Subscriptions.concat(recdata)))
        } else {
          resolve(data.Subscriptions)
        }
      })
      .catch(reject);
  })
}

// require('fs').readFile('./testEvents/get.json', (err, data) => {
//   exports.handler(JSON.parse(data), {}, (err, response) => {
//     console.log(response)
//     print(JSON.parse(response.body))
//   })
// })
