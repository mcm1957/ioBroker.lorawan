const mqtt = require("mqtt");

class mqttClientClass {
	constructor(adapter, ip, port, connectionSettings) {
		this.adapter = adapter;
		this.url = "mqtts";
		this.client = mqtt.connect(`${this.url}://${ip}`, {
			port: port,
			username: connectionSettings.username,
			password: connectionSettings.password,
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
			/*this.adapter.log.debug("INCOMMING !!!: " + message);
			let value;
			let type = "";
			try {
				value = JSON.parse(message.toString());
				if (typeof value == "string") throw new Error("nope");
				type = typeof value;
			} catch (e) {
				value = message.toString();
				if (isNaN(value)) {
					if (value == "ON" || value == "OFF") {
						type = "boolean";
						value = value == "ON";
					} else {
						type = "string";
					}
				} else if (value == "") {
					type = "string";
				} else {
					type = "number";
					value = parseFloat(value);
				}
			}
			this.adapter.log.debug(`${topic}: ${type} - ${typeof value == "object" ? JSON.stringify(value) : value}`);*/
			await this.adapter.handleMessage(connectionSettings.application, topic, message);
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