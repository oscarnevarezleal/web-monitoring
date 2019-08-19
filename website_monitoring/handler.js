'use strict';

// our request guy
const fetch = require('node-fetch');
const URL = require('url');

// loggin is important
const debug = require('debug')('monitoring');

// Aws operations
const {
    publishMonitoringResults,
    processFailedRequestResponse
} = require('./lib/awsOperations');

// We define the urls that this script will attempt to check

const {URLS} = require('./lib/constants')

// In case we have environment variables for fetch optionsWe use library defaults
// See here https://www.npmjs.com/package/node-fetch

const FETCH_TIMEOUT = process.env.FETCH_TIMEOUT || 0
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

    debug("Init processing")

    // Define our default request options

    let requestOptions = {
        timeout: FETCH_TIMEOUT,
        follow: FETCH_FOLLOW,
    }

    // All the urls are mapped as resources promises

    let promises = URLS.map(async (url, index, array) => {
        return new Promise(async (resolve, reject) => {
            let requestDate = new Date().toISOString()
            let requestUrl = URL.parse(url)
            let sharedObj = {
                requestDate,
                host: requestUrl.hostname
            }
            try {
                let response = await fetch(url, Object.assign({method: 'GET'}, requestOptions))
                const bodyText = await response.text()

                const allowedStatusCodes = [401, 301, 302, 200]
                const validCode = allowedStatusCodes.includes(response.status)

                if (!validCode) {

                    let code = `HTTP_INVALID_CODE_STATUS`
                    let message = `request to ${url} failed, reason: ` +
                        `The site respond with a ${response.status} http header when 200 was expected. ${code}`
                    reject({...sharedObj, code, message, response, error: true, url})
                }

                const invalidResponse = bodyText.indexOf("The site is experiencing technical difficulties") > -1 ||
                    bodyText.indexOf("tekniske utfordringer") > -1;

                // debug("response.invalidResponse = ", invalidResponse)

                if (invalidResponse) {
                    let code = `GENERAL_ERROR`
                    reject({
                        error: true,
                        code,
                        ...sharedObj,
                        message: "An error was found in the response",
                        response: null,
                        requestUrl,
                        url
                    })
                }

                debug("Resolving " + (invalidResponse ? "[!]" : "OK"), url)

                resolve({
                    ...sharedObj, response, requestDate, requestUrl
                })

            } catch (e) {
                let error = true
                let code = e.code
                reject({...sharedObj, error, code, message: e.message, response: null, url})
            }
        })
    })

    // Explanation: Promise.all is all or nothing so we map the rejection of every promise
    // So we can handle it appropriately, we also handle then all the results

    debug("Still processing")

    return await Promise.all(
        promises.map(p =>
            p.catch(async e =>
                await processFailedRequestResponse('FATAL', e, {...e, requestSettings}))
        ))
        .then(async results => await publishMonitoringResults(results.sort(r => r.error === null))) // Every result including errors
        .catch(async e => debug("catch", e));

};

// module.exports.monitor();