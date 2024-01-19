const mqtt = require("mqtt");

class mqttClientClass {
	constructor(adapter, settings) {
		this.adapter = adapter;
		this.mqttprefix = settings.ssl ? "mqtts://" : "mqtt://";
		this.client = mqtt.connect(`${this.mqttprefix}${settings.ipUrl}`, {
			port: settings.port,
			username: settings.username,
			password: settings.password,
			clientId: `iobroker_${this.adapter.namespace}`,
		});
		this.client.on("connect", () => {
			this.adapter.log.info(`Connection is active.`);
			this.adapter.setState("info.connection", true, true);
			this.client.subscribe("#", (err) => {
				if (err) {
					this.adapter.log.error(`On subscribe: ${err}`);
				}
			});
		});
		this.client.on("disconnect", () => {
			this.adapter.setState("info.connection", false, true);
			this.adapter.log.debug(`disconnected`);
		});
		this.client.on("error", (err) => {
			this.adapter.log.error(`${err}`);
		});

		this.client.on("close", () => {
			this.adapter.setState("info.connection", false, true);
			this.adapter.log.info(`Connection is closed.`);
		});

		this.client.on("message", async (topic, message) => {
			// @ts-ignore
			try{
				this.adapter.log.debug(`Topic: ` + topic);
				if(topic.indexOf("con") !== -1){
					return;
				}
				this.adapter.log.debug(`Message has type: ` + typeof message);
				this.adapter.log.debug(`stringifyed logging` + JSON.stringify(message));
				this.adapter.log.debug(`normal logging` + message);
			}
			catch(error){
				this.adapter.log.warn(`error in logging:` + error);
			}
			// @ts-ignore
			message = JSON.parse(message);

			await this.adapter.messagehandler.handleMessage(topic, message);
		});
	}
	async publish(topic, message, opt) {
		this.adapter.log.debug(`Publishing topic: ${topic} with message: ${message}.`);
		await this.client.publishAsync(topic, message, opt);
	}

	destroy(){
		this.client.end();
	}
}

module.exports = mqttClientClass;