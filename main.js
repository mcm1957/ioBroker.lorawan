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
		/*
			Definitionen der Umrechnungen:
			dec to hex:
			const decdata = 33;
			const decdatastring = decdata.toString(16);

			base64 to hex:
			return(Buffer.from(base_64, 'base64').toString("hex"));

			ascii to hex:
			return (Buffer.from(ascii).toString('hex'));

			ascii to base64:
			return (Buffer.from(ascii).toString('base64'));

			base64 to string:
			return(Buffer.from(base_64, 'base64').toString());

			hex 2 base64:
			return Buffer.from(hex, 'hex').toString('base64')

			hex 2 number:
			parseInt(hexdata,16);

			return Math.abs(dec).toString(16);
			// force 4 Digits
			//return ('0000' + dec.toString(16).toUpperCase()).slice(-4);
			// force 2 Digits
			// return ('00' + dec.toString(16).toUpperCase()).slice(-2);

	*/
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

			this.fakeMessage = {
				"deduplicationId":"655e5d71-a625-4332-833c-2700fcacefc2",
				"time":"2024-01-17T21:08:41.551292+00:00",
				"deviceInfo":{
					"tenantId":"52f14cd4-c6f1-4fbd-8f87-4025e1d49242",
					"tenantName":"ChirpStack",
					"applicationId":"59bcc5a7-59e2-4481-9615-fc4e58791915",
					"applicationName":"Mclimate_Vicki",
					"deviceProfileId":"3a9bc28f-3664-4bdf-b3be-a20d1eb32dc8",
					"deviceProfileName":"Mclimate_Vicki",
					"deviceName":"MClimate_Vicki_Heizkoerperventil_001",
					"devEui":"70b3d52dd300ed31",
					"deviceClassEnabled":"CLASS_A",
					"tags":{
					}
				},
				"devAddr":"01343968",
				"adr":true,
				"dr":5,
				"fCnt":8702,
				"fPort":2,
				"confirmed":false,
				"data":"GAGBDItw9vYR0DA=",
				"object":{
					"attachedBackplate":true,
					"batteryVoltage":3.3,
					"relativeHumidity":43.75,
					"childLock":false,
					"brokenSensor":false,
					"calibrationFailed":false,
					"sensorTemperature":19.53,
					"motorPosition":502.0,
					"highMotorConsumption":false,
					"reason":81.0,
					"perceiveAsOnline":true,
					"targetTemperature":12.0,
					"lowMotorConsumption":false,
					"operationalMode":1.0,
					"openWindow":false,
					"motorRange":502.0
				},
				"rxInfo":[
					{
						"gatewayId":"50313953530a4750",
						"uplinkId":56321,
						"gwTime":"2024-01-17T21:08:41.551292+00:00",
						"nsTime":"2024-01-17T21:08:41.570017809+00:00",
						"rssi":-74,
						"snr":11.0,
						"channel":4,
						"location":{
							"latitude":53.55485739669679,
							"longitude":9.921609163284304
						},
						"context":"albPhA==",
						"metadata":{
							"region_config_id":"eu868",
							"region_common_name":"EU868"
						},
						"crcStatus":"CRC_OK"
					}
				],
				"txInfo":{
					"frequency":867300000,
					"modulation":{
						"lora":{
							"bandwidth":125000,
							"spreadingFactor":7,
							"codeRate":"CR_4_5"
						}
					}
				}
			};
			//await this.messagehandler.handleMessage("a/up", this.fakeMessage);
		}
		catch(error){
			this.log.error(`error at ${activeFunction}: ` + error.stack);
		}
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
				//this.log.debug(`state ${id} changed: val: ${state.val} - ack: ${state.ack}`);
				// The state was changed => only states with ack = false will be processed, others will be ignored
				if(!state.ack){
					// Check for downlink in id
					if(id.indexOf("downlink") !== -1){
						// get information of the changing state
						// @ts-ignore
						const changeInfo = await this.getChangeInfo(id);
						if(this.config.origin === "ttn"){
							let appending = "push";
							if(changeInfo?.changedState === "push"){
								const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo,`/down/${appending}`);
								this.sendDownlink(downlinkTopic,state.val);
								this.setStateAsync(id,state.val,true);
							}
							else if(changeInfo?.changedState === "replace"){
								appending = "replace";
								const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo,`/down/${appending}`);
								this.sendDownlink(downlinkTopic,state.val);
								this.setStateAsync(id,state.val,true);
							}
							else{
								const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo,`/down/${appending}`);
								const downlinkConfig = this.downlinkConfighandler?.getDownlinkConfig(changeInfo);
								if(downlinkConfig !== undefined){
									const downlink = this.downlinkConfighandler?.getDownlink(downlinkConfig,state,changeInfo);
									if(downlink !== undefined){
										this.sendDownlink(downlinkTopic,JSON.stringify(downlink));
									}
									this.setStateAsync(id,state.val,true);
								}
							}
						}
						else if(this.config.origin === "chirpstack"){
							if(changeInfo?.changedState === "push"){
								const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo,`/down`);
								this.sendDownlink(downlinkTopic,state.val);
								this.setStateAsync(id,state.val,true);
							}
							else{
								const downlinkTopic = this.downlinkConfighandler?.getDownlinkTopic(changeInfo,`/down`);
								const downlinkConfig = this.downlinkConfighandler?.getDownlinkConfig(changeInfo);
								if(downlinkConfig !== undefined){
									const downlink = this.downlinkConfighandler?.getDownlink(downlinkConfig,state,changeInfo);
									if(downlink !== undefined){
										this.sendDownlink(downlinkTopic,JSON.stringify(downlink));
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

	sendDownlink(topic,message){
		this.mqttClient?.publish(topic,message);
	}

	async getChangeInfo(id){
		const activeFunction = "getChangeInfo";
		try{
			id = this.removeNamespace(id);
			const idElements = id.split(".");
			const changeInfo = {
				applicationId : idElements[0],
				dev_uid : idElements[2],
				device_id : idElements[3],
				changedState : idElements[idElements.length - 1],
				deviceType : "",
				allElements : idElements
			};
			const myId = `${changeInfo.applicationId}.devices.${changeInfo.dev_uid}.${changeInfo.device_id}.configuration.devicetype`;
			const deviceTypeIdState = await this.getStateAsync(myId);
			if(deviceTypeIdState){
				// @ts-ignore
				changeInfo.deviceType = deviceTypeIdState.val;
			}
			return changeInfo;
		}
		catch(error){
			this.log.error(`error at ${activeFunction}: ` + error);
		}
	}

	removeNamespace(id){
		if(id.indexOf(this.namespace) !== -1){
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