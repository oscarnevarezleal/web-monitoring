// aws sdk
const AWS = require('aws-sdk');
const debug = require('debug')('monitoring');
const utils = require('./utils');
const networkError = require('./network-errors');
const view = require('./view');
const {upsertCheck, findByProperty} = require('./dynamoDB');

const constants = require('./constants')
const {AWS_REGION, TOPIC_ARN, S3_ASSETS_BUCKET_NAME, STATUS} = constants

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

    debug('publishMessageToSNS', params)

    // Return promise and SNS service object
    const {MessageId, RequestId} = await new AWS.SNS({apiVersion: '2010-03-31'})
        .publish(params)
        .promise();

    viewData.Message = Message

    return viewData
}

/**
 *
 * @param domain
 * @returns {Promise<void>}
 */
async function getCurrentDomainStatus(domain) {
    let results = await findByProperty(AWS, 'HostName', domain)
    return results ? results.pop() : null
}

/**
 *
 * @param results
 * @returns {Promise<void>}
 */
async function publishMonitoringResults(results) {

    await new Promise(async (resolve, reject) => {
        for (let i = 0; i < results.length; i++) {
            const value = results[i]
            const hasError = value.hasOwnProperty('error')
            const host = value.host
            const domainStatus = await getCurrentDomainStatus(host)

            // Here we handle back alive scenario
            if (!hasError && domainStatus && domainStatus.last_status === STATUS.DOWN) {

                debug(`${host} it was down but now it is alive !!`)

                // Create publish parameters
                let params = {
                    Message,
                    Subject: `${host} is back online.`,
                    TopicArn: TOPIC_ARN
                };

                // Return promise and SNS service object
                const {MessageId, RequestId} = await new AWS.SNS({apiVersion: '2010-03-31'})
                    .publish(params)
                    .promise();

            }

            // Update status on database
            const item = {
                HostName: value.host,
                LastStatus: hasError ? STATUS.DOWN : STATUS.UP
            }

            await upsertCheck(AWS, item)
        }
        resolve()
    })

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
                debug("Successfully saved object to " + bucketName + "/" + keyName);
        });
    })
}

/**
 *
 * @param error_level
 * @param error
 * @param data
 */
const processFailedRequestResponse = async (error_level, error, data) => {

    let {host} = error

    let domainStatus = await getCurrentDomainStatus(host)

    if (!domainStatus) { // has never been registered

        const item = {
            HostName: host,
            LastStatus: data.hasOwnProperty('error') ? STATUS.DOWN : STATUS.UP
        }

        await upsertCheck(AWS, item)

    } else if (domainStatus.last_status === STATUS.UP) {

        debug(`${host} it was up now it's down`)
        // manage it
        await publishMessageToSNS(error_level, error, data)

    } else if (domainStatus.last_status === STATUS.DOWN) {

        debug(`${host} it was down, yeah we know. Do not double inform about it`)

    }

    return data

}

module.exports = {processFailedRequestResponse, publishMonitoringResults}