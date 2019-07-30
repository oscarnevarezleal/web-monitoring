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

    // debug("format", code, view)
    return new Promise(function (resolve, reject) {
        try {
            readFile(`./views/${code}.txt`, "utf8").then(file => {
                try {
                    resolve(template.render(file, view))
                } catch (e) {
                    debug(e)
                    reject("")
                }
            })
        } catch (e) {
            debug(e)
            reject("")
        }

    });
}

module.exports = {format}