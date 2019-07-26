'use strict';

// our request guy
const fetch = require('node-fetch');

// loggin is important
const debug = require('debug')('monitoring');

// Aws operations
const {publishMessageToSNS, publishMonitoringResults} = require('./lib/awsOperations');

// We define the urls that this script will attempt to check
const URLS = process.env.DOMAINS ? JSON.parse(process.env.DOMAINS) : [
//    'http://www.google.com',
//    'http://onevarez.com',
//    'http://onevares.com',
    'http://localhost:8000'
];


// In case we have environment variables for fetch optionsWe use library defaults
// See here https://www.npmjs.com/package/node-fetch

const FETCH_TIMEOUT = process.env.FETCH_TIMEOUT || 3000
const FETCH_FOLLOW = process.env.FETCH_FOLLOW || 20

const requestSettings = {
    FETCH_TIMEOUT,
    FETCH_FOLLOW
}

/**
 *
 * @param event
 * @returns {Promise<void>}
 */
module.exports.monitor = async event => {

    // Define our default request options

    let requestOptions = {
        timeout: FETCH_TIMEOUT,
        follow: FETCH_FOLLOW,
    }

    // All the urls are mapped as resources promises

    let promises = URLS.map(async (url, index, array) => {
        return new Promise(async (resolve, reject) => {
            let response = await fetch(url, Object.assign({method: 'GET'}, requestOptions))
            // debug("response.status ", response.status)
            if (response.status !== 200) {
                let code = `HTTP_INVALID_CODE_STATUS`
                let message = `request to ${url} failed, reason: ` +
                    `The site respond with a ${response.status} http header when 200 was expected. ${code}`
                reject({code, message, response, url})
            }
            return response
        })
    })

    // Explanation: Promise.all is all or nothing so we map the rejection of every promise
    // So we can handle it appropriately, we also handle then all the results

    Promise.all(
        promises.map(p =>
            p.catch(async e =>
                await publishMessageToSNS('FATAL', e, {requestSettings}))
        ))
        .then(async results => await publishMonitoringResults(results)) // Every result including errors
        .catch(async e => debug("catch", e));

    // Use this code if you don't use the http event with the LAMBDA-PROXY integration
    // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};

module.exports.monitor();
