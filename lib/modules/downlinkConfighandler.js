const downlinkClass = require("./downlinks/downlinks");

class downlinkConfighandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		//this.presentConfigs = {};

		this.downlinks = new downlinkClass();
		this.activeDownlinkConfigs = {};
	}

	addAndMergeDownlinks(){
		// @ts-ignore
		for(const downlinkConfig of Object.values(this.downlinks.internalDownlinks)){
			this.addDownlinkConfigByType(downlinkConfig);
		}
		for(const downlinkConfig of Object.values(this.adapter.config.downlinkConfigAccordion)){
			this.addDownlinkConfigByType(downlinkConfig);
		}
	}

	addDownlinkConfigByType(downlinkConfig){
		if(!this.activeDownlinkConfigs[downlinkConfig.deviceType]){
			this.activeDownlinkConfigs[downlinkConfig.deviceType] = {};
		}
		if(!this.activeDownlinkConfigs[downlinkConfig.deviceType][downlinkConfig.name]){
			this.activeDownlinkConfigs[downlinkConfig.deviceType][downlinkConfig.name] = downlinkConfig;
		}
	}

	getDownlinkConfig(changeInfo,options){
		const activeFunction = "getDownlinkConfig";
		try{
			let downlinkConfig = undefined;
			for(const deviceType in this.activeDownlinkConfigs){
				if(changeInfo.deviceType.indexOf(deviceType) === 0 || deviceType === "all"){
					if(this.activeDownlinkConfigs[deviceType][changeInfo.changedState]){
						downlinkConfig = this.activeDownlinkConfigs[deviceType][changeInfo.changedState];
						break;
					}
				}
			}
			if(downlinkConfig !== undefined)
			{
				return downlinkConfig;
			}
			else{
				if(options && options.startupCheck){
					if(changeInfo.deviceType === ""){
						this.adapter.log.warn(`${activeFunction}: the downlinkstate ${changeInfo.changedState} is not configed in devices without a typedefinition.`);
					}
					else{
						this.adapter.log.warn(`${activeFunction}: the downlinkstate ${changeInfo.changedState} is not configed in devices with the typ: ${changeInfo.deviceType}`);
					}
				}
				else{
					this.adapter.log.warn(`${activeFunction}: no downlinkConfig found: deviceType: ${changeInfo.deviceType} - changed state: ${changeInfo.changedState}`);
				}
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
		}
	}

	getDownlink(downlinkConfig,state){
		// Select datahandling in case of origin
		if(this.adapter.config.ttn){
			return this.getTtnDownlink(downlinkConfig,state);
		}
		else if(this.adapter.config.chirpstack){
			//	 this.handleChirpstack(topic,message);
		}
	}

	getTtnDownlink(downlinkConfig,state){
		// declare pyaload variable
		let payloadInHex = "";
		let multipliedVal = 0;
		//Check type
		if(downlinkConfig.type === "button"){
			payloadInHex = downlinkConfig.onClick;
		}
		else if(downlinkConfig.type === "boolean"){
			if(state.val){
				payloadInHex = downlinkConfig.on;
			}
			else{
				payloadInHex = downlinkConfig.off;
			}
		}
		else{
			switch(downlinkConfig.type){
				case "number":
					multipliedVal = state.val * downlinkConfig.multiplyfaktor;
					payloadInHex = multipliedVal.toString(16).toUpperCase();
					break;

				case "ascii":
				case "string":
					payloadInHex = Buffer.from(state.val).toString("hex");
					break;
			}
			const numberOfDiggits = downlinkConfig.length - downlinkConfig.front.length + downlinkConfig.end.length;
			let zeroDiggits = "";

			for(let index = 1; index <= numberOfDiggits; index++){
				zeroDiggits += "0";
			}
			payloadInHex = (zeroDiggits + payloadInHex).slice(-numberOfDiggits);
			payloadInHex = downlinkConfig.front + payloadInHex + downlinkConfig.end;
		}

		//convert hex in base64
		const payloadInBase64 = Buffer.from(payloadInHex, "hex").toString("base64");

		// retun the whole downlink
		return 	{downlinks:[{f_port:downlinkConfig.port,frm_payload:payloadInBase64,priority:downlinkConfig.priority,confirmed:downlinkConfig.confirmed}]};
	}

	/*********************************************************************
	 * *********************** Downlinktopic *****************************
	 * ******************************************************************/

	getDownlinkTopic(id,suffix){
		// Select datahandling in case of origin
		if(this.adapter.config.ttn){
			return this.getTtnDownlinkTopicFromDirektory(id,suffix);
		}
		else if(this.adapter.config.chirpstack){
			//	 this.handleChirpstack(topic,message);
		}
	}

	getTtnDownlinkTopicFromDirektory(changeInfo,suffix){
		const topicElements = {
			Version : "v3",
			applicationId : `/${changeInfo.applicationId}`,
			applicationFrom : "@ttn",
			devices : `/devices`,
			device_id : `/${changeInfo.device_id}`,
			suffix : suffix
		};
		let downlink = "";
		for(const stringelement of Object.values(topicElements)){
			downlink += stringelement;
		}
		return downlink;
	}
}

module.exports = downlinkConfighandlerClass;