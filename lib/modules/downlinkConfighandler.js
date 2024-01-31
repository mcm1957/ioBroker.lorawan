const fs = require("fs");

class downlinkConfighandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		this.activeDownlinkConfigs = {};
		this.activeExpertConfigs = {};
	}

	/*********************************************************************
	 * *************************** General  ******************************
	 * ******************************************************************/

	addAndMergeDownlinkConfigs(){
		const activeFunction = "addAndMergeDownlinkConfigs";
		this.adapter.log.silly(`the standard and configed downlinks will be merged`);
		try{
			// Add standard downlink config
			const internalDownlinks = this.getJsonArrayFromDirectoryfiles(`${this.adapter.adapterDir}/lib/modules/downlinks`);
			if(Array.isArray(internalDownlinks)){
				for(const downlinkConfig of Object.values(internalDownlinks)){
					this.addDownlinkConfigByType(downlinkConfig,this.activeDownlinkConfigs);
				}
			}
			// Add user downlink config
			for(const downlinkConfig of Object.values(this.adapter.config.downlinkConfigAccordion)){
				this.addDownlinkConfigByType(downlinkConfig,this.activeDownlinkConfigs);
			}
			// add expert configs
			for(const expertConfig of Object.values(this.adapter.config.ExpertsettingsAccordion)){
				this.addDownlinkConfigByType(expertConfig,this.activeExpertConfigs,{isExpertconfig:true});
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			return undefined;
		}
	}

	addDownlinkConfigByType(downlinkConfig,config,options){
		const activeFunction = "addDownlinkConfigByType";
		try{
			if(!config[downlinkConfig.deviceType]){
				config[downlinkConfig.deviceType] = {};
			}
			if(!options || !options.isExpertconfig){
				if(!config[downlinkConfig.deviceType][downlinkConfig.name]){
					config[downlinkConfig.deviceType][downlinkConfig.name] = downlinkConfig;
				}
			}
			else{
				config[downlinkConfig.deviceType] = downlinkConfig;
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			return undefined;
		}
	}

	getJsonArrayFromDirectoryfiles(directory){
		const activeFunction = "getJsonArrayFromDirectoryfiles";
		this.adapter.log.silly(`the standard configs will readout from json files.`);
		try{
			let myJsonArray = [];
			fs.readdirSync(directory).forEach(file => {
				if(file.endsWith(".json")){
					myJsonArray = myJsonArray.concat(JSON.parse(fs.readFileSync(`${directory}/${file}`, "utf-8")));
				}
			});
			return myJsonArray;
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			return undefined;
		}
	}

	getBestMatchForExpertConfig(changeInfo){
		const activeFunction = "checkBestMerge";
		try{
			let foundMatch = "";
			let foundLength = 0;
			for(const deviceType in this.activeExpertConfigs){
				if((deviceType === "all" || changeInfo.deviceType.indexOf(deviceType) === 0) && deviceType.length > foundLength){
					foundMatch = deviceType;
					if(deviceType !== "all"){
						foundLength = deviceType.length;
					}
				}
			}

			if(foundMatch !== ""){
				return foundMatch;
			}
			else{
				return undefined;
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
		}
	}

	getDownlinkConfig(changeInfo,options){
		const activeFunction = "getDownlinkConfig";
		this.adapter.log.silly(`the downlinkconfig is requested for the following changeinfo: ${JSON.stringify(changeInfo)}`);
		try{
			let downlinkConfig = undefined;
			let foundLength = 0;
			for(const deviceType in this.activeDownlinkConfigs){
				if((deviceType === "all" || changeInfo.deviceType.indexOf(deviceType) === 0) && deviceType.length > foundLength){
					if(this.activeDownlinkConfigs[deviceType][changeInfo.changedState]){
						downlinkConfig = this.activeDownlinkConfigs[deviceType][changeInfo.changedState];
						if(deviceType !== "all"){
							foundLength = deviceType.length;
						}
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
	 * ************************** Downlink *******************************
	 * ******************************************************************/

	getDownlink(downlinkConfig,payloadInHex,changeInfo){
		// Select downlink in case of origin
		this.adapter.log.silly(`the downlink for the changeinfo ${JSON.stringify(changeInfo)} is requested`);
		switch(this.adapter.config.origin){
			case "ttn":
				return this.getTtnDownlink(downlinkConfig,payloadInHex);
			case "chirpstack":
				return this.getChirpstackDownlink(downlinkConfig,payloadInHex,changeInfo);
		}
	}

	/*********************************************************************
	 * ******************* Calculation of payload ************************
	 * ******************************************************************/

	calculatePayloadInHex(downlinkConfig,state){
		// declare pyaload variable
		this.adapter.log.silly(`the payload will be calculated`);
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
			let resultAfterdecimalPlaces = 0;
			switch(downlinkConfig.type){
				case "number":
					if(downlinkConfig.decimalPlaces){
						const expotentialFactor = Math.pow(10,downlinkConfig.decimalPlaces);
						const StateWithExotetialFactor = Math.trunc(state.val * expotentialFactor);
						resultAfterdecimalPlaces = StateWithExotetialFactor / expotentialFactor;
					}
					else{
						resultAfterdecimalPlaces = Math.trunc(state.val);
					}
					multipliedVal = resultAfterdecimalPlaces * downlinkConfig.multiplyfaktor;
					payloadInHex = multipliedVal.toString(16).toUpperCase();
					numberOfDiggits = downlinkConfig.length - downlinkConfig.front.length - downlinkConfig.end.length;
					for(let index = 1; index <= numberOfDiggits; index++){
						zeroDiggits += "0";
					}
					payloadInHex = (zeroDiggits + payloadInHex).slice(-numberOfDiggits);
					payloadInHex = downlinkConfig.front + payloadInHex + downlinkConfig.end;
					break;

				case "ascii":
					payloadInHex = Buffer.from(state.val).toString("hex").toUpperCase();
					numberOfDiggits = downlinkConfig.length - downlinkConfig.front.length - downlinkConfig.end.length;
					for(let index = 1; index <= numberOfDiggits; index++){
						zeroDiggits += "0";
					}
					payloadInHex = (zeroDiggits + payloadInHex).slice(-numberOfDiggits);
					payloadInHex = downlinkConfig.front + payloadInHex + downlinkConfig.end;
					break;

				case "string":
					payloadInHex = downlinkConfig.front + state.val + downlinkConfig.end;
					payloadInHex = Buffer.from(payloadInHex).toString("hex").toUpperCase();
					break;
			}
		}
		return payloadInHex;
	}

	/*********************************************************************
	 * **************************** TTN  *********************************
	 * ******************************************************************/

	/*********************************************************************
	 * *********************** Downlinktopic *****************************
	 * ******************************************************************/

	getTtnDownlinkTopicFromDirektory(changeInfo,suffix){
		this.adapter.log.silly(`the downlinktopic for ttn is requested`);
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

	getTtnDownlink(downlinkConfig,payloadInHex){
		const activeFunction = "getTtnDownlink";
		try{
			this.adapter.log.silly(`the downlink for ttn is requested`);
			//convert hex in base64
			const payloadInBase64 = Buffer.from(payloadInHex, "hex").toString("base64");
			// retun the whole downlink
			return 	{downlinks:[{f_port:downlinkConfig.port,frm_payload:payloadInBase64,priority:downlinkConfig.priority,confirmed:downlinkConfig.confirmed}]};
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
		}
	}




	/*********************************************************************
	 * ************************** Chirpstack  ****************************
	 * ******************************************************************/

	/*********************************************************************
	 * *********************** Downlinktopic *****************************
	 * ******************************************************************/

	getChirpstackDownlinkTopicFromDirektory(changeInfo,suffix){
		this.adapter.log.silly(`the downlinktopic for chirpstack is requested`);
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

	getChirpstackDownlink(downlinkConfig,payloadInHex,changeInfo){
		this.adapter.log.silly(`the downlink for chirpstack is requested`);

		const payloadInBase64 = Buffer.from(payloadInHex, "hex").toString("base64");
		// retun the whole downlink
		return 	{devEui:changeInfo.dev_uid,confirmed:downlinkConfig.confirmed,fPort:downlinkConfig.port,data:payloadInBase64};
	}
}

module.exports = downlinkConfighandlerClass;