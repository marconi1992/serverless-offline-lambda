# serverless-offline-lambda

This [Serverless](https://github.com/serverless/serverless) plugin extends [serverless-offline](https://github.com/dherault/serverless-offline) to emulates [AWS λ](https://aws.amazon.com/lambda) Invocations on your local machine to speed up your development cycles. To do so, it starts an HTTP server to invoke a Lambda using the [AWS SDK](https://github.com/aws/aws-sdk-js).

## Installation

First, add Serverless Plugin to your project:

`npm install serverless-offline-lambda --save-dev`

Then inside your project's `serverless.yml` file add following entry to the plugins section: `serverless-offline-lamda`. If there is no plugin section you will need to add it to the file.

It should look something like this:

```YAML
plugins:
  - serverless-offline-lambda
  - serverless-offline
```

## Example

Run Serverless Offline
```
sls offline start
```

Invoke Lambda using [AWS SDK](https://github.com/aws/aws-sdk-js).

```javascript
const AWS = require('aws-sdk');

const lambda = new AWS.Lambda({
  endpoint: new AWS.Endpoint('http://localhost:4000'),
  region: 'us-east-1',
});


lambda.invoke({
  FunctionName: 'function',
  InvocationType: 'Event',
  Payload: JSON.stringify({ key: 'value' }),
}).promise();

```