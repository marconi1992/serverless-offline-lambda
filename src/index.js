const Hapi = require('hapi');
const functionHelper = require('serverless-offline/src/functionHelper');

const defaultConfig = {
  port: 4000,
  host: 'localhost',
};

class LambdaOffline {
  constructor(serverless, options) {
    this.service = serverless.service;
    this.options = options;
    this.serverless = serverless;
    this.serverlessLog = serverless.cli.log.bind(serverless.cli);
    this.config = Object.assign(
      {},
      defaultConfig,
      (this.service.custom || {})['serverless-offline'],
      (this.service.custom && this.service.custom.lambda) || {}
    );

    this.hooks = {
      'before:offline:start:init': this.start.bind(this),
    };
  }

  start() {
    this.buidServer();
  }

  log(message) {
    this.serverlessLog(message);
  }

  awsRequestId() {
    return Math.random().toString(36).substring(7);
  }

  buidServer() {
    this.server = new Hapi.Server();
    this.server.connection({ port: this.config.port, host: this.config.host });

    const { servicePath } = this.serverless.config;
    const serviceRuntime = this.service.provider.runtime;

    const funOptionsCache = Object.keys(this.service.functions).reduce((acc, key) => {
      const fun = this.service.getFunction(key);
      acc[key] = functionHelper.getFunctionOptions(fun, key, servicePath, serviceRuntime);
      return acc;
    }, {});

    this.server.route({
      method: 'POST',
      path: '/2015-03-31/functions/{functionName}/invocations',
      config: {
        handler: (req, reply) => {
          const invocationType = req.headers['x-amz-invocation-type'];
          const { functionName } = req.params;

          const funOptions = funOptionsCache[functionName];

          if (!funOptions) {
            return reply().code(404);
          }

          const handler = functionHelper.createHandler(funOptions, this.options);

          if (!handler) {
            return reply().code(404);
          }
          const { payload } = req;

          let body = '';
          payload.on('data', (chunk) => {
            body += chunk;
          });

          return payload.on('end', () => {
            const event = body ? JSON.parse(body) : {};
            this.serverlessLog(`Invoke (λ: ${functionName})`);
            if (invocationType === 'Event') {
              handler(event, { awsRequestId: this.awsRequestId() }, () => {});
              reply().code(202);
            } else {
              const done = (res) => {
                reply(JSON.stringify(res)).code(202);
              };
              const result = handler(event, { awsRequestId: this.awsRequestId() }, done);

              if (result && typeof result.then === 'function' && typeof result.catch === 'function') {
                result.then(done);
              }
            }
          });
        },
        payload: {
          output: 'stream',
          parse: false,
        },
      },
    });

    this.server.start().then(() => this.log(`Offline Lambda Server listening on ${this.server.info.uri}`));
  }
}

module.exports = LambdaOffline;
