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
			keepalive: settings.keepalive
		});

		// Variables for correct connection (disconnection) notification / logging
		this.interanConnectionstate = false;
		this.errorCountdown = 0;
		this.numberOfErrorsToLog = 10;

		this.client.on("connect", () => {
			if(!this.interanConnectionstate){
				this.adapter.log.info(`Connection is active.`);
				this.adapter.registerNotification("lorawan", "LoRaWAN Network Service connected", `The LoRaWAN Network Service ${settings.ipUrl} was connected`);
			}
			this.adapter.setState("info.connection", true, true);
			this.interanConnectionstate = true;
			this.errorCountdown = this.numberOfErrorsToLog;
			// @ts-ignore
			this.client.subscribe(this.getSubscribtionArray(), (err) => {
				if (err) {
					this.adapter.log.error(`On subscribe: ${err}`);
				}
			});
		});
		this.client.on("disconnect", () => {
			if(this.interanConnectionstate){
				this.adapter.setState("info.connection", false, true);
				this.interanConnectionstate = false;
				this.adapter.log.info(`disconnected`);
			}
		});
		this.client.on("error", (err) => {
			if(this.errorCountdown === 0){
				this.adapter.log.error(`${err}`);
				this.errorCountdown = this.numberOfErrorsToLog;
			}
			else{
				this.errorCountdown--;
			}
		});

		this.client.on("close", () => {
			if(this.interanConnectionstate){
				this.adapter.log.info(`Connection is closed.`);
				this.adapter.registerNotification("lorawan", "LoRaWAN Network Service disconnected", `The LoRaWAN Network Service ${settings.ipUrl} was disconnected`);
			}
			this.adapter.setState("info.connection", false, true);
			this.interanConnectionstate = false;
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