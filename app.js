const express = require('express'),
  bodyParser = require('body-parser'),
  rollbar = require('rollbar'),
  morgan = require('morgan'),
  path = require('path'),
  config = require('./config'),
  routes = require('./app/routes'),
  orm = require('./app/orm'),
  errors = require('./app/middlewares/errors'),
  migrationsManager = require('./migrations/migrations');

const init = () => {
  const app = express();
  const port = config.common.port || 8080;
  module.exports = app;

  app.use('/docs', express.static(path.join(__dirname, 'docs')));

  // Client must send "Content-Type: application/json" header
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  if (!config.isTesting) {
    morgan.token('req-params', (req) => req.params);
    app.use(morgan('[:date[clf]] :remote-addr - Request ":method :url" with params: :req-params. Response status: :status.'));
  }

  Promise.resolve().then(() => {
    if (!config.isTesting) {
      return migrationsManager.check();
    }
  }).then(() => orm.init(app)).then(() => {
    routes.init(app);

    app.use(errors.handle);
    app.use(rollbar.errorHandler(config.common.rollbar.accessToken, {
      enabled: !!config.common.rollbar.accessToken,
      environment: config.environment
    }));

    app.listen(port);
    console.log(`Listening on port: ${port}`); // eslint-disable-line
  }).catch(console.log); // eslint-disable-line

};
init();
