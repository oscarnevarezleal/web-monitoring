// aws sdk
const AWS = require('aws-sdk');
const debug = require('debug')('monitoring');
const utils = require('./utils');
const networkError = require('./network-errors');
const view = require('./view');

const constants = require('./constants')
const {AWS_REGION, TOPIC_ARN, S3_ASSETS_BUCKET_NAME} = constants

debug('Using AwsConfig', {AWS_REGION, TOPIC_ARN})

AWS.config.update({region: AWS_REGION});


/**
 *
 * @param error_level
 * @param error
 * @returns {Promise<void>}
 */
async function publishMessageToSNS(error_level, error, data) {

    data = data || {}
    let requestDate = new Date()
    let Message = error.message
    let networkErrorObj = networkError.parse(Message)
    let urlsOnMessage = utils.extractUrls(Message);
    let viewData = {...data, error, constants, Message, networkErrorObj, requestDate}

    let Subject = (error.requestUrl ? error.requestUrl.host : 'website') + ' is down'

    if (urlsOnMessage) {
        let requestUrl = urlsOnMessage[0]
        Subject = requestUrl.host + ' is down!'
        viewData = {...viewData, urlsOnMessage, requestUrl}
    }


    Message = await view.format(networkErrorObj.code || error.code, viewData)

    //let ErrorName = error.name.toUpperCase() + ":" + networkErrorObj.code

    // Create publish parameters
    let params = {
        Message,
        Subject,
        TopicArn: TOPIC_ARN
    };

    // debug('publishMessageToSNS', params)

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
async function publishMonitoringResults(results) {

    // debug('publishMonitoringResults', results)

    const s3 = new AWS.S3();

    var bucketName = S3_ASSETS_BUCKET_NAME;
    var keyName = "index.html"
    var content = await view.format("LIST", {results})

    var params = {
        Bucket: bucketName,
        Key: keyName,
        Body: content,
        ContentType: 'text/html'
    };

    return new Promise((resolve, reject) => {
        s3.putObject(params, (err, data) => {
            if (err)
                reject(err)
            else
                resolve("Successfully saved object to " + bucketName + "/" + keyName);
        });
    })
}

module.exports = {publishMessageToSNS, publishMonitoringResults}