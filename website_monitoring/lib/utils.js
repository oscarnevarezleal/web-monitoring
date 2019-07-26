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
        return matches ? matches.map(e => url.parse(e)) : null
    }
}