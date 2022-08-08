# serverless-plugin-telegram-webhook

Serverless plugin for automatically setting telegram webhook to lambda api gateway url on deploy.

## Install

```bash
yarn add -D serverless-plugin-telegram-webhook
# or
npm install --save-dev serverless-plugin-telegram-webhook
```

Add the following plugin to your `serverless.yml`:

```yaml
plugins:
  - serverless-plugin-telegram-webhook
```

## Configure

Set the config in the `self:custom` of your `serverless.yml` file.

### Using reference to lambda

```yaml
custom:
  telegramWebhook:
    token: "my-telegram-bot-token"
    webhook:
      type: function
      value: webhookHandler # your lambda function identifier
```

### Using reference to api gateway path

```yaml
custom:
  telegramWebhook:
    token: "my-telegram-bot-token"
    webhook:
      type: path
      value: /webhook # your http api path
```

Your `serverless.yml` should be similar to this:

#### Using reference to lambda function

```yaml
service: serverless-example

plugins:
  - serverless-plugin-telegram-webhook

custom:
  telegramWebhook:
    token: my-telegram-bot-token
    webhook:
      type: function
      value: hello # reference to the hello lambda function

provider:
  name: aws # this plugin currently only works with aws

functions:
  hello:
    handler: handler.hello
    events:
      - http:
          path: hello
          method: get
```

#### Using api gateway path

```yaml
service: serverless-example

plugins:
  - serverless-plugin-telegram-webhook

custom:
  telegramWebhook:
    token: my-telegram-bot-token
    webhook:
      type: path
      value: /hello

provider:
  name: aws # this plugin currently only works with aws

functions:
  hello:
    handler: handler.hello
    events:
      - http:
          path: hello
          method: get
```

## Contributing

PRs are greatly appreciated, help us build this hugely needed tool so anyone else can easily build telegram bots using serverless framework.

1. Create a fork
2. Create your feature branch: `git checkout -b my-feature`
3. Commit your changes: `git commit -am 'add some feature'`
4. Push to the branch: `git push origin my-new-feature`
5. Submit a pull request 🚀
