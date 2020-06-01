# Web monitoring project

The goal for this project is to detect whether a website is down and inform via email about it.

This project is written in NodeJs and built on AWS using several services provided by the platform. Please refer to the Stack section for more details.

## Considerations

A website might be considered down if any of the following rules apply:

- Websites respond with a HTTP code other than 200
- Website contains the words "_tekniske utfordringer_" or "_The site is experiencing technical difficulties_"
- Certificate is expired
- Website is not responding or a timeout event is reached
- Domain name doesn't exist.


## Installation

### Configure AWS credentials

In order to have a proper AWS environment we need to setup the AWS cli locally.
More about this here https://aws.amazon.com/cli/

```
aws configure
```
When you type this command, the AWS CLI prompts you for four pieces of information (access key, secret access key, AWS Region, and output format), and stores them in a profile (a collection of settings) named default. This profile is then used any time you run an AWS CLI command that doesn't explicitly specify a profile to use.
You can read more about aws cli configuration here https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html

Next we need to install the dependencies and serverless framework for deployment.

### Project dependencies

```
npm i -g serverless
unzip website_monitoring.zip
cd cd website_monitoring
npm i
```


### Deploy the stack

Running this on default profile
```
serverless deploy --aws-profile morten
```
Running the installation script on a different profile (e.g mortek)
```
serverless deploy --aws-profile morten
```


## Stack

- SNS - We use SNS for email delivery
- Lamba - A lambda function check regularly a list of sites defined in _constants.js_
- Cloudfront - serves a monitoring HTML file from S3 bucket
- DynamoDb is used to preserve the status of each domain

## FAQS

#####How can I change the frequency of the monitor?
This can be done by altering the rate on _Serverless.yml_ and re deploying the solution.
e.g. 
```rate: rate(X minutes)```

#####How can I add multiple email subscribers to the Monitor status?
By default just one email is subscribed when the solution is deployed. You can however, subscribe adittional emails bu following the next steps:
- Go to **AWS Console** > **SNS service** > **Topics**
- Click on the topic _website-monitoring-dev-monitoring-sns-topic_ topic
- Create a **new Subscription** of type Email and specify the desired email address
    

#####How can I change the list of watched domains?
The list can be defined either by editing the file _website_monitoring/lib/constants.js_ or setting up a environmental variable _DOMAINS_.
Then re-deploy the solution
```serverless deploy --aws-profile morten```
