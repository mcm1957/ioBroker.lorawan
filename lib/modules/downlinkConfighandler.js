const fs = require("fs");
const { isDeepStrictEqual } = require("util");
//const crc16 = require("js-crc").crc16;

class downlinkConfighandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		this.activeDownlinkConfigs = {};
		this.deviceProfilesPath = "/lib/modules/deviceProfiles";
		this.internalDeviceProfilesPath = "/lib/modules/deviceProfiles/internal";
		this.internalDevices = {
			baseDevice: "internalBaseDevice"
		};
		//		this.source = "0258";
		//		this.adapter.log.warn(Buffer.from(this.source,"hex")).toUpperCase());
	}

	/*********************************************************************
	 * *************************** General  ******************************
	 * ******************************************************************/

	async addAndMergeDownlinkConfigs(){
		const activeFunction = "addAndMergeDownlinkConfigs";
		this.adapter.log.silly(`the standard and configed downlinks will be merged`);
		try{
			// Add standard downlink config
			const internalDownlinks = this.getJsonArrayFromDirectoryfiles(`${this.adapter.adapterDir}${this.deviceProfilesPath}`);
			if(Array.isArray(internalDownlinks)){
				for(const downlinkConfig of Object.values(internalDownlinks)){
					this.addDownlinkConfigByType(downlinkConfig,this.activeDownlinkConfigs);
				}
			}
			// Add user downlink config
			for(const downlinkConfig of Object.values(this.adapter.config.downlinkConfig)){
				this.addDownlinkConfigByType(downlinkConfig,this.activeDownlinkConfigs);
			}

			// Check active userconfig
			const adapterId = `system.adapter.${this.adapter.namespace}`;
			const obj = await this.adapter.getForeignObjectAsync(adapterId);
			// generate the Config without own objects
			const ownConfig = [];
			for(const downlinkConfig of Object.values(this.activeDownlinkConfigs)){
				ownConfig.push(JSON.parse(JSON.stringify(downlinkConfig)));
				delete ownConfig[ownConfig.length - 1].downlinkState;
				/*for(const downlinkParameter of Object.values(ownConfig[ownConfig.length - 1].downlinkParameter)){
					//delete elements out of downlinkParameter Array
					let parameterIndex = 0;
					while(parameterIndex !== -1){
						parameterIndex = downlinkParameter.findIndex((parameter) => {return parameter.notInConfig;});
						if(parameterIndex !== -1){
							downlinkParameter.splice(parameterIndex,1);
						}
					}
				}*/
			}

			// Add internal base downlinks
			const internalBaseDownlinks = this.getJsonArrayFromDirectoryfiles(`${this.adapter.adapterDir}${this.internalDeviceProfilesPath}`);
			if(Array.isArray(internalBaseDownlinks)){
				for(const downlinkConfig of Object.values(internalBaseDownlinks)){
					this.addDownlinkConfigByType(downlinkConfig,this.activeDownlinkConfigs);
				}
			}

			// Sort Array by Alphabet
			ownConfig.sort((a, b) => a.deviceType.toLowerCase() > b.deviceType.toLowerCase()?1:-1);
			if(!isDeepStrictEqual(obj.native.downlinkConfig,ownConfig)){
				obj.native.downlinkConfig = ownConfig;
				this.adapter.log.info("Adapter restart, because of reinit configuration");
				await this.adapter.setForeignObjectAsync(adapterId,obj);
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			return undefined;
		}
	}

	addDownlinkConfigByType(downlinkConfig,config){
		const activeFunction = "addDownlinkConfigByType";
		try{
			// override standard with userconfig
			config[downlinkConfig.deviceType] = downlinkConfig;
			config[downlinkConfig.deviceType].downlinkState = {};
			for(const downlinkParameter of Object.values(downlinkConfig.downlinkParameter)){
				config[downlinkConfig.deviceType].downlinkState[downlinkParameter.name.replace(this.adapter.FORBIDDEN_CHARS,"_")] = downlinkParameter;
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

	getBestMatchForDeviceType(changeInfo){
		const activeFunction = "checkBestMerge";
		try{
			let foundMatch = "";
			let foundLength = 0;
			for(const deviceType in this.activeDownlinkConfigs){
				if((deviceType === "all" || deviceType === this.internalDevices.baseDevice || changeInfo.deviceType.indexOf(deviceType) === 0) && deviceType.length > foundLength){
					if(foundLength === 0){
						foundMatch = deviceType;
					}
					if(deviceType !== "all" && deviceType !== this.internalDevices.baseDevice){
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

	getDownlinkParameter(changeInfo,options){
		const activeFunction = "getDownlinkParameter";
		this.adapter.log.silly(`the downlinkconfig is requested for the following changeinfo: ${JSON.stringify(changeInfo)}`);
		try{
			let downlinkConfig = undefined;
			let foundLength = 0;
			for(const deviceType in this.activeDownlinkConfigs){
				if((deviceType === "all" || deviceType === this.internalDevices.baseDevice || changeInfo.deviceType.indexOf(deviceType) === 0) && deviceType.length > foundLength){
					if(this.activeDownlinkConfigs[deviceType].downlinkState[changeInfo.changedState]){
						downlinkConfig = this.activeDownlinkConfigs[deviceType].downlinkState[changeInfo.changedState];
						if(deviceType !== "all" && deviceType !== this.internalDevices.baseDevice){
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
					this.adapter.log.warn(`${activeFunction}: no downlinkParameter found: deviceType: ${changeInfo.deviceType} - changed state: ${changeInfo.changedState}`);
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
			case this.adapter.origin.ttn:
				return this.getTtnDownlinkTopicFromDirektory(changeInfo,suffix);
			case this.adapter.origin.chirpstack:
				return this.getChirpstackDownlinkTopicFromDirektory(changeInfo,suffix);
		}
	}

	/*********************************************************************
	 * *********************** Topicsuffix *****************************
	 * ******************************************************************/

	getDownlinkTopicSuffix(state){
		const activeFunction = "getDownlinkTopicSuffix";
		try{
			const replace = "replace";
			switch(this.adapter.config.origin){
				case this.adapter.origin.ttn:
					switch(state){
						case replace:
							return "/down/replace";

						default:
							return "/down/push";
					}
				case this.adapter.origin.chirpstack:
					return "/down";
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
		}
	}

	/*********************************************************************
	 * ************************** Downlink *******************************
	 * ******************************************************************/

	getDownlink(downlinkConfig,payloadInHex,changeInfo){
		// Select downlink in case of origin
		this.adapter.log.silly(`the downlink for the changeinfo ${JSON.stringify(changeInfo)} is requested`);
		switch(this.adapter.config.origin){
			case this.adapter.origin.ttn:
				return this.getTtnDownlink(downlinkConfig,payloadInHex);
			case this.adapter.origin.chirpstack:
				return this.getChirpstackDownlink(downlinkConfig,payloadInHex,changeInfo);
		}
	}

	/*********************************************************************
	 * ******************* Calculation of payload ************************
	 * ******************************************************************/

	calculatePayloadInHex(downlinkParameter,state){
		// declare pyaload variable
		this.adapter.log.silly(`the payload will be calculated`);
		let payloadInHex = "";
		let multipliedVal = 0;
		//Check type
		if(downlinkParameter.type === "button"){
			payloadInHex = downlinkParameter.onClick;
		}
		else if(downlinkParameter.type === "boolean"){
			if(state.val){
				payloadInHex = downlinkParameter.on;
			}
			else{
				payloadInHex = downlinkParameter.off;
			}
		}
		else{
			let numberOfDiggits = 0;
			let zeroDiggits = "";
			let resultAfterdecimalPlaces = 0;
			switch(downlinkParameter.type){
				case "number":
					if(downlinkParameter.decimalPlaces){
						const expotentialFactor = Math.pow(10,downlinkParameter.decimalPlaces);
						const StateWithExotetialFactor = Math.trunc(state.val * expotentialFactor);
						resultAfterdecimalPlaces = StateWithExotetialFactor / expotentialFactor;
					}
					else{
						resultAfterdecimalPlaces = Math.trunc(state.val);
					}
					multipliedVal = resultAfterdecimalPlaces * downlinkParameter.multiplyfaktor;
					payloadInHex = multipliedVal.toString(16).toUpperCase();
					numberOfDiggits = downlinkParameter.lengthInByte * 2;
					for(let index = 1; index <= numberOfDiggits; index++){
						zeroDiggits += "0";
					}
					payloadInHex = (zeroDiggits + payloadInHex).slice(-numberOfDiggits);
					if(downlinkParameter.swap){
						payloadInHex = Buffer.from(payloadInHex,"hex").reverse().toString("hex");
					}
					payloadInHex = downlinkParameter.front + payloadInHex + downlinkParameter.end;
					break;

				case "ascii":
					payloadInHex = Buffer.from(state.val).toString("hex").toUpperCase();
					numberOfDiggits = downlinkParameter.lengthInByte * 2;
					for(let index = 1; index <= numberOfDiggits; index++){
						zeroDiggits += "0";
					}
					payloadInHex = (zeroDiggits + payloadInHex).slice(-numberOfDiggits);
					payloadInHex = downlinkParameter.front + payloadInHex + downlinkParameter.end;
					break;

				case "string":
					payloadInHex = downlinkParameter.front + state.val + downlinkParameter.end;
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