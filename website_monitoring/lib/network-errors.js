const debug = require('debug')('monitoring');
const util = require('util')
const fs = require('fs')
const readFile = util.promisify(fs.readFile)

const ENOTFOUND_REG_EXP = /request to (.*) failed, reason: (.*)/gi
const TIMEOUT_REG_EXP = /network timeout at: (.*)/gi


const getUppercaseError = (e) => {
    let regExpt = /[A-Z]+/;
    return regExpt.test(e) ? regExpt.exec(e)[0] : null
}


module.exports = {
    constants: {
        ENOTFOUND_REG_EXP,
        TIMEOUT_REG_EXP
    },

    /**
     *
     * @param e
     * @returns {{code: *}}
     */
    parse: (e) => {

        let code = getUppercaseError(e)

        // ENOTFOUND

        if (ENOTFOUND_REG_EXP.test(e)) {
            let matches = ENOTFOUND_REG_EXP.exec(e)
            let tokens = {code}
            return ({code, ...tokens})
        }

        if (TIMEOUT_REG_EXP.test(e)) {
            code = "TIMEOUT"
            let matches = TIMEOUT_REG_EXP.exec(e)
            let tokens = {code}
            return ({code, ...tokens})
        }

        return ""
    }
}