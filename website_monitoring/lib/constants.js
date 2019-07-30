module.exports = {
    STATUS: {
        UP: 'up',
        DOWN: 'down',
    },
    CLOUDFRONT_DISTRIBUTION_DOMAIN: process.env.CLOUDFRONT_DISTRIBUTION_DOMAIN,
    DYNAMO_DB: process.env.DYNAMO_DB,
    AWS_REGION: process.env.AWS_REGION,
    S3_ASSETS_BUCKET_NAME: process.env.S3_ASSETS_BUCKET_NAME,
    TOPIC_ARN: process.env.TOPIC_ARN,
    URLS: process.env.DOMAINS || [
        'https://24apotek.mementor.no',
        'https://adminsenter.no',
        'https://baroniet.no',
        'http://localhost'
    ]
}