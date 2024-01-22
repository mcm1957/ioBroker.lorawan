"use strict";

/*
 * Created with @iobroker/create-adapter v2.6.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require("@iobroker/adapter-core");
const mqttClientClass = require("./lib/modules/mqttclient");
const messagehandlerClass = require("./lib/modules/messagehandler");
const downlinkConfighandlerClass = require("./lib/modules/downlinkConfighandler");

class Lorawan extends utils.Adapter {

	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	constructor(options) {
		super({
			...options,
			name: "lorawan",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
	async onReady() {
		const activeFunction = "onReady";
		try{
			// create downlinkConfigs
			this.downlinkConfighandler = new downlinkConfighandlerClass(this);

			// create new messagehandler
			this.messagehandler = new messagehandlerClass(this);

			// Set all mqtt clients
			this.mqttClient =  new mqttClientClass(this,this.config);

			// Merge the configed and standard profile of downlinks
			this.downlinkConfighandler.addAndMergeDownlinkConfigs();

			// generate new configed downlinkstates on allready existing devices at adapter startup
			await this.messagehandler.generateDownlinkstatesAtStatup();

			//Subscribe all configuration and control states
			this.subscribeStatesAsync("*.configuration.*");
			this.subscribeStatesAsync("*downlink.control.*");
			this.log.debug(`the adapter start with the config: ${JSON.stringify(this.config)}.`);

			/*setTimeout(async () => {
				await this.startSimulation();
			}, 5000);*/
		}
		catch(error){
			this.log.error(`error at ${activeFunction}: ` + error);
		}
	}

	async startSimulation(){

		//const topic = "application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/a84041f621857cd2/event/up";
		//const message = {"deduplicationId":"96e4a065-ad5e-402d-a997-7b261072a33c","time":"2024-01-21T17:01:36.641008+00:00","deviceInfo":{"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242","tenantName":"ChirpStack","applicationId":"d63c10b6-9263-4ab3-9299-4308fa19a2ad","applicationName":"Benjamin Schmidt","deviceProfileId":"0b46400f-37ec-4f17-8005-168b06159347","deviceProfileName":"Dragino Feuchtesenor","deviceName":"Skimmer","devEui":"a84041f621857cd2","deviceClassEnabled":"CLASS_A","tags":{}},"devAddr":"01fd9738","adr":true,"dr":5,"fCnt":2,"fPort":2,"confirmed":false,"data":"DPYBAAD//wAA","object":{"soilconductivity":0.0,"soiltemperature":-0.1,"volt":3.318,"soilmoisture":0.0},"rxInfo":[{"gatewayId":"50303541b0344750","uplinkId":39169,"gwTime":"2024-01-21T17:01:36.641008+00:00","nsTime":"2024-01-21T17:01:37.695656999+00:00","rssi":-89,"snr":6.25,"rfChain":1,"location":{"latitude":50.69344693065449,"longitude":8.476783633232118},"context":"qESemw==","metadata":{"region_config_id":"eu868","region_common_name":"EU868"},"crcStatus":"CRC_OK"}],"txInfo":{"frequency":868100000,"modulation":{"lora":{"bandwidth":125000,"spreadingFactor":7,"codeRate":"CR_4_5"}}}};
		const topic = "application/d63c10b6-9263-4ab3-9299-4308fa19a2ad/device/a84041f621857cd2/command/down";
		const message = {"devEui":"a84041f621857cd2","confirmed":false,"fPort":1,"data":"AQAqMA=="};
		await this.messagehandler?.handleMessage(topic, message);
	}
	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 * @param {() => void} callback
	 */
	onUnload(callback) {
		try {
			this.mqttClient?.destroy();
			callback();
		} catch (e) {
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  * @param {string} id
	//  * @param {ioBroker.Object | null | undefined} obj
	//  */
	// onObjectChange(id, obj) {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 * @param {string} id
	 * @param {ioBroker.State | null | undefined} state
	 */
	async onStateChange(id, state) {
		const activeFunction = "onStateChange";
		try{
			if (state) {
				//this.log.silly(`state ${id} changed: val: ${state.val} - ack: ${state.ack}`);
				// The state was changed => only states with ack = false will be processed, others will be ignored
				if(!state.ack){
					// Check for downlink in id
					if(id.indexOf("downlink") !== -1){
						this.log.silly(`the state ${id} has changed to ${state.val}.`);
						// get information of the changing state
						const changeInfo = await this.getChangeInfo(id);
						if(this.config.origin === "ttn"){
							let appending = "push";
							if(changeInfo?.changedState === "push"){
								const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo,`/down/${appending}`);
								await this.sendDownlink(downlinkTopic,state.val);
								this.setStateAsync(id,state.val,true);
							}
							else if(changeInfo?.changedState === "replace"){
								appending = "replace";
								const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo,`/down/${appending}`);
								await this.sendDownlink(downlinkTopic,state.val,changeInfo);
								this.setStateAsync(id,state.val,true);
							}
							else{
								const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo,`/down/${appending}`);
								const downlinkConfig = this.downlinkConfighandler?.getDownlinkConfig(changeInfo);
								if(downlinkConfig !== undefined){
									const payloadInHex = this.downlinkConfighandler?.calculatePayloadInHex(downlinkConfig,state);
									await this.writeNextSend(changeInfo?.obectStartDirectory,payloadInHex);
									const downlink = this.downlinkConfighandler?.getDownlink(downlinkConfig,payloadInHex,changeInfo);
									if(downlink !== undefined){
										await this.sendDownlink(downlinkTopic,JSON.stringify(downlink),changeInfo);
									}
									this.setStateAsync(id,state.val,true);
								}
							}
						}
						else if(this.config.origin === "chirpstack"){
							if(changeInfo?.changedState === "push"){
								const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo,`/down`);
								await this.sendDownlink(downlinkTopic,state.val,changeInfo);
								this.setStateAsync(id,state.val,true);
							}
							else{
								const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo,`/down`);
								const downlinkConfig = this.downlinkConfighandler?.getDownlinkConfig(changeInfo);
								if(downlinkConfig !== undefined){
									const payloadInHex = this.downlinkConfighandler?.calculatePayloadInHex(downlinkConfig,state);
									await this.writeNextSend(changeInfo?.obectStartDirectory,payloadInHex);
									const downlink = this.downlinkConfighandler?.getDownlink(downlinkConfig,payloadInHex,changeInfo);
									if(downlink !== undefined){
										await this.sendDownlink(downlinkTopic,JSON.stringify(downlink),changeInfo);
									}
									this.setStateAsync(id,state.val,true);
								}
							}
						}
					}
					// State is from configuration path
					else{
						this.setStateAsync(id,state.val,true);
					}
				}
			} else {
				// The state was deleted
				this.log.info(`state ${id} deleted`);
			}
		}
		catch(error){
			this.log.error(`error at ${activeFunction}: ` + error);
		}
	}

	async checkSendDownlinkWithUplink(id){
		const changeInfo = await this.getChangeInfo(id);
		this.log.silly(JSON.stringify(changeInfo));
	}

	async writeNextSend(startDirectory,payloadInHex){
		const idFolder = `${startDirectory}.${this.messagehandler?.directoryhandler.directoryStructur.downlinkNextSend}`;
		await this.setStateAsync(`${idFolder}.hex`,payloadInHex,true);
	}

	async sendDownlink(topic,message,changeInfo){
		await this.mqttClient?.publish(topic,message);
		const idFolderNextSend = `${changeInfo.obectStartDirectory}.${this.messagehandler?.directoryhandler.directoryStructur.downlinkNextSend}`;
		const idFolderLastSend = `${changeInfo.obectStartDirectory}.${this.messagehandler?.directoryhandler.directoryStructur.downlinkLastSend}`;
		const nextSend = await this.getStateAsync(`${idFolderNextSend}.hex`);
		const lastSend = this.getHexpayloadFromDownlink(message);
		await this.setStateAsync(`${idFolderLastSend}.hex`,lastSend,true);
		if(nextSend && lastSend === nextSend?.val){
			await this.setStateAsync(`${idFolderNextSend}.hex`,0,true);
		}
	}

	getHexpayloadFromDownlink(downlinkmessage){
		let downlink = downlinkmessage;
		if(typeof downlink === "string"){
			downlink = JSON.parse(downlinkmessage);
		}
		else if(typeof downlink !== "object"){
			return 0;
		}
		let payload = "";
		switch(this.config.origin){
			case "ttn":
				payload = downlink.downlinks[0].frm_payload;
				break;

			case "chirpstack":
				payload = downlink.data;
				break;
		}
		return Buffer.from(payload, "base64").toString("hex").toUpperCase();
	}

	getBaseDeviceInfo(id){
		const activeFunction = "getBaseDeviceInfo";
		try{
			id = this.removeNamespace(id);
			const idElements = id.split(".");
			const deviceInfo = {
				id: id,
				applicationId : idElements[0],
				dev_uid : idElements[2],
				device_id : idElements[3],
				changedState : idElements[idElements.length - 1],
				obectStartDirectory : `${idElements[0]}.devices.${idElements[2]}.${idElements[3]}`,
				allElements : idElements
			};
			return deviceInfo;
		}
		catch(error){
			this.log.error(`error at ${activeFunction}: ` + error);
		}
	}

	async getChangeInfo(id){
		const activeFunction = "getChangeInfo";
		try{
			this.log.silly(`changeinfo of id ${id}, will be generated.`);
			const changeInfo = this.getBaseDeviceInfo(id);
			const myId = `${changeInfo?.applicationId}.devices.${changeInfo?.dev_uid}.${changeInfo?.device_id}.configuration.devicetype`;
			const deviceTypeIdState = await this.getStateAsync(myId);
			if(deviceTypeIdState){
				// @ts-ignore
				changeInfo.deviceType = deviceTypeIdState.val;
			}
			this.log.silly(`changeinfo is ${JSON.stringify(changeInfo)}.`);
			return changeInfo;
		}
		catch(error){
			this.log.error(`error at ${activeFunction}: ` + error);
		}
	}

	removeNamespace(id){
		if(id.indexOf(this.namespace) !== -1){
			this.log.silly(`namespace will be removed from id ${id}.`);
			id = id.substring(this.namespace.length + 1,id.length);
		}
		return id;
	}


	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  * @param {ioBroker.Message} obj
	//  */
	// onMessage(obj) {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");

	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }

}

if (require.main !== module) {
	// Export the constructor in compact mode
	/**
	 * @param {Partial<utils.AdapterOptions>} [options={}]
	 */
	module.exports = (options) => new Lorawan(options);
} else {
	// otherwise start the instance directly
	new Lorawan();
}