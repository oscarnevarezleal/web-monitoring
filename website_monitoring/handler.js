'use strict';

// aws sdk
const AWS = require('aws-sdk');

// our request guy
const fetch = require('node-fetch');

// loggin is important
const debug = require('debug')('monitoring');

const utils = require('./lib/utils');
const networkError = require('./lib/network-errors');
const view = require('./lib/view');

// We define the urls that this script will attempt to check
const URLS = process.env.DOMAINS ? JSON.parse(process.env.DOMAINS) : [
    'http://www.google.com',
    'http://onevarez.com',
    'http://onevares.com',
];

// there is no default for this environment variables, they need to exist
const S3_ASSETS_BUCKET_NAME = process.env.S3_ASSETS_BUCKET_NAME
const AWS_REGION = process.env.AWS_REGION
const TOPIC_ARN = process.env.TOPIC_ARN

debug('Using AwsConfig', {AWS_REGION, TOPIC_ARN})

AWS.config.update({region: AWS_REGION});

// In case we have environment variables for fetch optionsWe use library defaults
// See here https://www.npmjs.com/package/node-fetch

const FETCH_TIMEOUT = process.env.FETCH_TIMEOUT || 50
const FETCH_FOLLOW = process.env.FETCH_FOLLOW || 20

const requestSettings = {
    FETCH_TIMEOUT,
    FETCH_FOLLOW
}

/**
 *
 * @param error_level
 * @param error
 * @returns {Promise<void>}
 */
async function publishMessageToSNS(error_level, error) {

    let requestDate = new Date()
    let Message = error.message
    let networkErrorObj = networkError.parse(Message)
    let urlsOnMessage = utils.extractUrls(Message);
    let requestUrl = urlsOnMessage[0]
    let viewData = {requestUrl, Message, networkErrorObj, requestDate, requestSettings}

    Message = await view.format(networkErrorObj.code, viewData)
    //let ErrorName = error.name.toUpperCase() + ":" + networkErrorObj.code
    //debug('publishMessageToSNS', Message)

    // Create publish parameters
    let params = {
        Message,
        Subject: 'Website monitor issue',
        TopicArn: TOPIC_ARN
    };

    // Return promise and SNS service object
    const {MessageId, RequestId} = await new AWS.SNS({apiVersion: '2010-03-31'})
        .publish(params)
        .promise();

    viewData.Message = Message

    return viewData
}

/**
 *
 * @param results
 * @returns {Promise<void>}
 */
async function publicMonitoringResults(results) {

    // debug('publicMonitoringResults', results)

    const s3 = new AWS.S3();

    var bucketName = S3_ASSETS_BUCKET_NAME;
    var keyName = "index.html"
    var content = await view.format("LIST", {results})

    var params = {Bucket: bucketName, Key: keyName, Body: content};

    return new Promise((resolve, reject) => {
        s3.putObject(params, (err, data) => {
            if (err)
                reject(err)
            else
                resolve("Successfully saved object to " + bucketName + "/" + keyName);
        });
    })
}

module.exports.monitor = async event => {

    // Define our default request options

    let requestOptions = {
        timeout: FETCH_TIMEOUT,
        follow: FETCH_FOLLOW,
    }

    // All the urls are mapped as resources promises

    let promises = URLS.map(async (url, index, array) => {
        return await fetch(url, Object.assign({method: 'GET'}, requestOptions))
    })

    // Explanation: Promise.all is all or nothing so we map the rejection of every promise
    // So we can handle it appropriately, we also handle then all the results

    Promise.all(
        promises.map(p =>
            p.catch(async e =>
                await publishMessageToSNS('FATAL', e))
        ))
        .then(async results => await publicMonitoringResults(results)) // Every result including errors
        .catch(async e => debug("catch", e));

    // Use this code if you don't use the http event with the LAMBDA-PROXY integration
    // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

module.exports.monitor();
