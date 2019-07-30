const debug = require('debug')('monitoring');
const constants = require('./constants')
const {DYNAMO_DB} = constants
/**
 *
 * @param AWS
 * @param item
 * @param callback
 * @returns {Promise<*>}
 */
const upsertCheck = async function (AWS, item, callback) {

    const docClient = new AWS.DynamoDB.DocumentClient();
    const TableName = DYNAMO_DB
    const now = new Date();

    const params = {
        TableName,
        Key: {
            "HostName": item.HostName
        },
        UpdateExpression: "set changed_on = :changed_on, last_status = :last_status",
        //ConditionExpression: "attribute_not_exists(HostName) OR HostName = :HostName",
        ExpressionAttributeValues: {
            ':changed_on': now.getTime(),
            ':last_status': item.LastStatus,
        },
        ReturnValues: "UPDATED_NEW"
    };

    return new Promise((resolve, reject) => {
        return docClient.update(params, function (err, data) {
            if (err) {
                reject(err)
                debug(`Unable to add item to ${TableName} `, params);
                debug("Error JSON:", JSON.stringify(err, null, 2));
            } else {
                resolve(data)
                // debug("Item updated:", item);
                // debug("Item added:", data);
            }
            // callback(err, data);
        });
    })
}
/**
 *
 * @param AWS
 * @param property
 * @param value
 * @returns {Promise<void>}
 */
const findByProperty = async function (AWS, property, value) {
    const docClient = new AWS.DynamoDB.DocumentClient();
    const TableName = DYNAMO_DB

    let KeyConditionExpression = `#${property} = :${property}`

    let ExpressionAttributeNames = {}
    ExpressionAttributeNames[`#${property}`] = property;

    let ExpressionAttributeValues = {}
    ExpressionAttributeValues[`:${property}`] = value;

    // console.log(`Querying for ${property} : ${value}`);

    var params = {
        TableName,
        KeyConditionExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues
    };

    return new Promise((resolve, reject) => {
        docClient.query(params, function (err, data) {
            if (err) {
                debug("Unable to query. Error:", JSON.stringify(err, null, 2));
                reject(err)
            } else {
                debug("Query succeeded.");
                resolve(data.Items)
            }
        });
    })


}

module.exports = {upsertCheck, findByProperty}