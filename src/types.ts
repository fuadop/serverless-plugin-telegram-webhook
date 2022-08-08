export interface Config {
	telegramWebhook: TelegramWebhook;
	"telegram-webhook": TelegramWebhook;
	telegram_webhook: TelegramWebhook;
	telegramwebhook: TelegramWebhook;
}

export interface TelegramWebhook {
	token: string;
	webhook: {
		type: "function" | "path";
		value: string;
	};
}

export interface Context {
	log: LogInterface;
}

export type LogContext = LogInterface | ((x: string) => void);

export interface LogInterface {
	warning: (x: string) => void;
	debug: (x: string) => void;
	info: (x: string) => void;
	notice: (x: string) => void;
	error: (x: string) => void;
	success: (x: string) => void;
}

export interface AWSStackOutput {
	OutputKey: string;
	OutputValue: string;
	Description: string;
	ExportName: string;
}
