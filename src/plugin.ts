import Serverless, { Options } from "serverless";
import * as https from "node:https";
import { RequestOptions } from "node:http";
import { Context, Config, TelegramWebhook, AWSStackOutput } from "./types";

class PluginTelegramWebhook {
	public hooks: { [x: string]: Function };

	constructor(public sls: Serverless, _: Options, private ctx: Context) {
		this.hooks = {
			"after:deploy:deploy": this.setWebhook.bind(this),
			"after:remove:remove": this.removeWebhook.bind(this),
		};
	}

	// set the api gateway url as telegram bot webhook url
	public async setWebhook(): Promise<void> {
		this.validateWebhookConfig();
		const { webhook } = this.resolveConfig();

		switch (webhook.type) {
			case "function":
				await this.setWebhookFunction(webhook.value);
				break;
			case "path":
				await this.setWebhookPath(webhook.value);
				break;
			default:
				throw new Error(
					"[serverless-plugin-telegram-webhook] Invalid webhook type"
				);
		}
	}

	// remove the api gateway url from the telegram webhook url - on serverless destroy
	public async removeWebhook(): Promise<void> {
		this.ctx.log.notice(
			"[serverless-plugin-telegram-webhook] Removing webhook url from https://telegram.org"
		);
		const res = await this.apiCall("setWebhook", { url: "" });
		if (res?.ok === false) {
			this.ctx.log.error(
				"[serverless-plugin-telegram-webhook] https://api.telegram.org Remove webhook url failed with response: "
			);
			this.ctx.log.error(res);
			return;
		}

		this.ctx.log.success(
			`[serverless-plugin-telegram-webhook] Successfully removed webhook url from https://api.telegram.org`
		);
		this.ctx.log.info("Response from https://api.telegram.org: ");
		this.ctx.log.info(res);
	}

	private async setWebhookFunction(lambda: string): Promise<void> {
		// look for lambda function with that name
		const func = this.sls.service.getFunction(lambda);
		if (!func)
			throw new Error(
				`[serverless-plugin-telegram-webhook] self:functions.${lambda} not found`
			);

		const event = (func.events || []).find(
			(event) => event.http || event.httpApi
		);
		if (!event)
			throw new Error(
				`[serverless-plugin-telegram-webhook] self:functions.${lambda} has no http or httpApi event attached to it`
			);

		const path = (event.http || event.httpApi)?.path;
		if (!path)
			throw new Error(
				`[serverless-plugin-telegram-webhook] self:functions.${lambda} http/httpApi event is missing the "path" property`
			);

		return await this.setWebhookPath(path);
	}

	private async setWebhookPath(path: string): Promise<void> {
		// merge path with service endpoint
		const endpoint = await this.resolveServiceEndpoint();
		if (!endpoint) return;

		// full webhook url
		const url = new URL(path, endpoint).href;

		// set webhook on telegram db
		const res = await this.apiCall("setWebhook", { url });
		if (res?.ok === false) {
			this.ctx.log.error(
				"[serverless-plugin-telegram-webhook] https://api.telegram.org setWebhook API call failed with response: "
			);
			this.ctx.log.error(res);
			return;
		}

		this.ctx.log.success(
			`[serverless-plugin-telegram-webhook] Successfully set https://api.telegram.org bot webhook to ${url}`
		);
		this.ctx.log.info("Response from https://api.telegram.org: ");
		this.ctx.log.info(res);
	}

	private async resolveServiceEndpoint(): Promise<string> {
		const aws = this.sls.getProvider("aws");
		const res = await aws.request("CloudFormation", "describeStacks", {
			StackName: aws.naming.getStackName(),
		});

		if (!res || !res.Stacks?.length) {
			throw new Error(
				`[serverless-plugin-telegram-webhook] Stack: ${aws.naming.getStackName()} not found`
			);
		}

		const outputs = res.Stacks[0].Outputs as AWSStackOutput[];
		let serviceEndpointOutput = outputs.find(
			({ OutputKey }) => OutputKey === "ServiceEndpoint"
		);
		if (!serviceEndpointOutput) {
			throw new Error(
				`[] Stack: ${aws.naming.getStackName()} does not have a service endpoint attached (i.e no lambda is triggered by http/httpApi)`
			);
		}

		return serviceEndpointOutput.OutputValue;
	}

	private async apiCall(
		method: string,
		body?: { [x: string]: any }
	): Promise<any> {
		return new Promise((resolve, reject) => {
			let chunks: Uint8Array[] = [];
			const opts: RequestOptions = {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			};
			const req = https.request(this.resolveMethodUrl(method), opts, (res) => {
				res.on("error", (error) => reject(error));
				res.on("data", (chunk: Uint8Array) => {
					chunks.push(chunk);
				});
				res.on("end", () => {
					const buffer = Buffer.concat(chunks);
					try {
						resolve(JSON.parse(buffer.toString()));
					} catch {
						resolve(buffer.toString());
					}
				});
			});
			if (body) {
				req.write(JSON.stringify(body));
			}
			req.end();
		});
	}

	private resolveMethodUrl(method: string): string {
		const token = this.resolveToken();
		return `https://api.telegram.org/bot${token}/${method}`;
	}

	private resolveConfig(): TelegramWebhook {
		const config: Partial<Config> = this.sls.service.custom as Config;

		if (config) {
			if (config["telegramWebhook"]) return config["telegramWebhook"];
			if (config["telegram-webhook"]) return config["telegram-webhook"];
			if (config["telegram_webhook"]) return config["telegram_webhook"];
			if (config["telegramwebhook"]) return config["telegramwebhook"];
		}

		throw new Error(
			"Unable to resolve serverless-plugin-telegram-webhook config in self:custom"
		);
	}

	private resolveToken(): string {
		const conf = this.resolveConfig();
		if (conf["token"]) return conf["token"];

		throw new Error(
			"Unable to resolve serverless-plugin-telegram-webhook token (telegram bot token)"
		);
	}

	private validateWebhookConfig(): void {
		const conf = this.resolveConfig();
		if (!conf["webhook"] || !conf["webhook"].type || !conf["webhook"].value)
			throw new Error(
				"Unable to resolve serverless-plugin-telegram-webhook webhook config"
			);
	}
}

module.exports = PluginTelegramWebhook;
