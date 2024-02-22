const mqtt = require("mqtt");

class mqttClientClass {
	constructor(adapter, settings) {
		this.adapter = adapter;
		this.mqttprefix = settings.ssl ? "mqtts://" : "mqtt://";
		this.client = mqtt.connect(`${this.mqttprefix}${settings.ipUrl}`, {
			port: settings.port,
			username: settings.username,
			password: settings.password,
			clientId: `iobroker_${this.adapter.namespace}`
		});
		this.client.on("connect", () => {
			this.adapter.log.info(`Connection is active.`);
			this.adapter.setState("info.connection", true, true);
			// @ts-ignore
			this.client.subscribe(this.getSubscribtionArray(), (err) => {
				if (err) {
					this.adapter.log.error(`On subscribe: ${err}`);
				}
			});
		});
		this.client.on("disconnect", () => {
			this.adapter.setState("info.connection", false, true);
			this.adapter.log.info(`disconnected`);
		});
		this.client.on("error", (err) => {
			this.adapter.log.error(`${err}`);
		});

		this.client.on("close", () => {
			this.adapter.setState("info.connection", false, true);
			this.adapter.log.info(`Connection is closed.`);
		});

		this.client.on("message", async (topic, message) => {
			this.adapter.log.debug(`incomming topic: ${topic}`);
			this.adapter.log.debug(`incomming message: ${message}`);
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

	getSubscribtionArray(){
		switch(this.adapter.config.origin){
			case this.adapter.origin.ttn:
				return ["v3/+/devices/+/+","v3/+/devices/+/down/+"];
			case this.adapter.origin.chirpstack:
				return ["application/+/device/+/event/+","application/+/device/+/command/down"];
		}
	}
}

module.exports = mqttClientClass;