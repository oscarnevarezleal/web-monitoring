const debug = require('debug')('monitoring');
const template = require('mustache')
const util = require('util')
const fs = require('fs')
const readFile = util.promisify(fs.readFile)

/**
 *
 * @param code
 * @param view
 * @returns {Promise<*>}
 */
const format = async (code, view) => {

    return new Promise(function (resolve, reject) {
        readFile(`./views/${code}.txt`, "utf8").then(file => {
            resolve(template.render(file, view))
        })
    });
}

module.exports = {format}