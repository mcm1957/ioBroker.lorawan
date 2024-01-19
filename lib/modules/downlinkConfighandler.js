const downlinkClass = require("./downlinks/downlinks");

class downlinkConfighandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		//this.presentConfigs = {};

		this.downlinks = new downlinkClass(adapter);
		this.activeDownlinkConfigs = {};
	}


	/*********************************************************************
	 * *************************** General  ******************************
	 * ******************************************************************/

	addAndMergeDownlinkConfigs(){
		this.adapter.log.debug(`the standard and configed downlinks will be merged`);
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
		this.adapter.log.debug(`the downlinkconfig is requested for the following changeinfo: ${JSON.stringify(changeInfo)}`);
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

	getDownlink(downlinkConfig,state,changeInfo){
		// Select downlink in case of origin
		this.adapter.log.debug(`the downlink for the changeinfo ${JSON.stringify(changeInfo)} is requested`);
		switch(this.adapter.config.origin){
			case "ttn":
				return this.getTtnDownlink(downlinkConfig,state);
			case "chirpstack":
				return this.getChirpstackDownlink(downlinkConfig,state,changeInfo);
		}
	}

	/*********************************************************************
	 * ******************* Calculation of payload ************************
	 * ******************************************************************/

	calculatePayload(downlinkConfig,state){
		// declare pyaload variable
		this.adapter.log.debug(`the payload will be calculated`);
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
			let numberOfDiggits = 0;
			let zeroDiggits = "";
			switch(downlinkConfig.type){
				case "number":
					multipliedVal = state.val * downlinkConfig.multiplyfaktor;
					payloadInHex = multipliedVal.toString(16).toUpperCase();
					break;

				case "ascii":
					payloadInHex = Buffer.from(state.val).toString("hex");
					numberOfDiggits = downlinkConfig.length - downlinkConfig.front.length - downlinkConfig.end.length;
					for(let index = 1; index <= numberOfDiggits; index++){
						zeroDiggits += "0";
					}
					payloadInHex = (zeroDiggits + payloadInHex).slice(-numberOfDiggits);
					break;

				case "string":
					payloadInHex = Buffer.from(state.val).toString("hex");
					break;
			}

			payloadInHex = downlinkConfig.front + payloadInHex + downlinkConfig.end;
		}

		//convert hex in base64
		return Buffer.from(payloadInHex, "hex").toString("base64");

	}

	/*********************************************************************
	 * *********************** Downlinktopic *****************************
	 * ******************************************************************/

	getDownlinkTopic(changeInfo,suffix){
		// Select downlinktopic in case of origin
		switch(this.adapter.config.origin){
			case "ttn":
				return this.getTtnDownlinkTopicFromDirektory(changeInfo,suffix);
			case "chirpstack":
				return this.getChirpstackDownlinkTopicFromDirektory(changeInfo,suffix);
		}
	}

	/*********************************************************************
	 * **************************** TTN  *********************************
	 * ******************************************************************/

	/*********************************************************************
	 * *********************** Downlinktopic *****************************
	 * ******************************************************************/

	getTtnDownlinkTopicFromDirektory(changeInfo,suffix){
		this.adapter.log.debug(`the downlinktopic for ttn is requested`);
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

	/*********************************************************************
	 * ************************** Downlink ******************************
	 * ******************************************************************/

	getTtnDownlink(downlinkConfig,state){
		this.adapter.log.debug(`the downlink for ttn is requested`);
		const payloadInBase64 = this.calculatePayload(downlinkConfig,state);
		// retun the whole downlink
		return 	{downlinks:[{f_port:downlinkConfig.port,frm_payload:payloadInBase64,priority:downlinkConfig.priority,confirmed:downlinkConfig.confirmed}]};
	}




	/*********************************************************************
	 * ************************** Chirpstack  ****************************
	 * ******************************************************************/

	/*********************************************************************
	 * *********************** Downlinktopic *****************************
	 * ******************************************************************/

	getChirpstackDownlinkTopicFromDirektory(changeInfo,suffix){
		this.adapter.log.debug(`the downlinktopic for chirpstack is requested`);
		const topicElements = {
			Version : "application",
			applicationId : `/${changeInfo.applicationId}`,
			device : `/device`,
			device_uid : `/${changeInfo.dev_uid}`,
			command: `/command`,
			suffix : suffix
		};
		let downlink = "";
		for(const stringelement of Object.values(topicElements)){
			downlink += stringelement;
		}
		return downlink;
	}

	/*********************************************************************
	 * ************************** Downlink ******************************
	 * ******************************************************************/

	getChirpstackDownlink(downlinkConfig,state,changeInfo){
		this.adapter.log.debug(`the downlink for chirpstack is requested`);
		const payloadInBase64 = this.calculatePayload(downlinkConfig,state);
		// retun the whole downlink
		return 	{devEui:changeInfo.dev_uid,confirmed:downlinkConfig.confirmed,fPort:downlinkConfig.port,data:payloadInBase64};
	}
}

module.exports = downlinkConfighandlerClass;