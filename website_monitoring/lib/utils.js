const url = require('url');

module.exports = {
    /**
     *
     * @param e
     * @returns {*[]}
     */
    extractUrls: (e) => {
        const regExp = /(https?\:\/\/)?([^\.\s]+)?[^\.\s]+\.[^\s]+/gi
        const matches = regExp.exec(e)
        return matches && matches.length ? matches.map(e => e ? url.parse(e) : {}) : null
    }
}