'use strict';

// aws sdk
const AWS = require('aws-sdk');

// our request guy
const fetch = require('node-fetch');

// loggin is important
const debug = require('debug')('monitoring');

// We define the urls that this script will attempt to check
const URLS = process.env.DOMAINS ? JSON.parse(process.env.DOMAINS) : [
    'http://www.google.com',
    'http://onevarez.com',
    'http://onevares.com',
];

// there is no default for this environment variables, they need to exist
const AWS_REGION = process.env.AWS_REGION
const TOPIC_ARN = process.env.TOPIC_ARN

debug('Using AwsConfig', {AWS_REGION, TOPIC_ARN})

AWS.config.update({region: AWS_REGION});

// In case we have environment variables for fetch optionsWe use library defaults
// See here https://www.npmjs.com/package/node-fetch

const FETCH_TIMEOUT = process.env.FETCH_TIMEOUT || 50
const FETCH_FOLLOW = process.env.FETCH_FOLLOW || 20

async function publishMessageToSNS(error_level, Message, error) {

    debug('publishMessageToSNS', error_level, Message)

    // Create publish parameters
    let params = {
        Message,
        TopicArn: TOPIC_ARN
    };

    // Return promise and SNS service object

    return await new AWS.SNS({apiVersion: '2010-03-31'}).publish(params).promise();
}

module.exports.monitor = async event => {

    // Define our default request options

    let requestOptions = {
        timeout: FETCH_TIMEOUT,
        follow: FETCH_FOLLOW,
    }

    // All the urls are mapped as resources promises

    let promises = URLS.map(async (value, index, array) => {
        return await fetch(value, Object.assign({method: 'GET'}, requestOptions))
    })

    // Explanation: Promise.all is all or nothing so we map the rejection of every promise
    // So we can handle it appropriately, we also handle then all the results

    Promise.all(promises.map(p => p.catch(async e => await publishMessageToSNS('FATAL', e.message, e))))
        .then(async results => debug("res", results)) // Every result including errors
        .catch(async e => debug("catch", e));

    // Use this code if you don't use the http event with the LAMBDA-PROXY integration
    // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

module.exports.monitor();
