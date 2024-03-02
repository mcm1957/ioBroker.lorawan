const fs = require("fs");
const { isDeepStrictEqual } = require("util");
const {crc16} = require("easy-crc");

class downlinkConfighandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		this.activeDownlinkConfigs = {};
		this.deviceProfilesPath = "/lib/modules/deviceProfiles";
		this.internalDeviceProfilesPath = "/lib/modules/deviceProfiles/internal";
		this.internalDevices = {
			baseDevice: "internalBaseDevice"
		};

		this.downlinkParameterAttributs = {
			name: "",
			port: 1,
			priority: "NORMAL",
			type: "number",
			confirmed: false,
			front: "",
			end: "",
			lengthInByte: 3,
			on: "",
			off: "",
			onClick: "",
			multiplyfaktor: 1,
			unit: "",
			crc: "noCrc",
			limitMin: false,
			limitMinValue: 0,
			limitMax: false,
			limitMaxValue: 0,
			swap: false,
			decimalPlaces: 0
		};
	}

	/*********************************************************************
	 * *************************** General  ******************************
	 * ******************************************************************/

	async addAndMergeDownlinkConfigs(){
		const activeFunction = "addAndMergeDownlinkConfigs";
		this.adapter.log.silly(`the standard and configed downlinks will be merged`);
		try{
			// Add user downlink config first
			for(const downlinkConfig of Object.values(this.adapter.config.downlinkConfig)){
				this.addDownlinkConfigByType(downlinkConfig,this.activeDownlinkConfigs);
			}
			// Add standard downlink config if devices not present
			const internalDownlinks = this.getJsonArrayFromDirectoryfiles(`${this.adapter.adapterDir}${this.deviceProfilesPath}`);
			if(Array.isArray(internalDownlinks)){
				for(const downlinkConfig of Object.values(internalDownlinks)){
					this.addDownlinkConfigByType(downlinkConfig,this.activeDownlinkConfigs);
				}
			}
			// Check active userconfig
			const adapterId = `system.adapter.${this.adapter.namespace}`;
			const obj = await this.adapter.getForeignObjectAsync(adapterId);
			// generate the Config without own objects
			const ownConfig = [];
			for(const downlinkConfig of Object.values(this.activeDownlinkConfigs)){
				ownConfig.push(structuredClone(downlinkConfig));
				// delete internal structure (to compare with config)
				delete ownConfig[ownConfig.length - 1].downlinkState;
			}
			// Add internal base downlinks
			const internalBaseDownlinks = this.getJsonArrayFromDirectoryfiles(`${this.adapter.adapterDir}${this.internalDeviceProfilesPath}`);
			if(Array.isArray(internalBaseDownlinks)){
				for(const downlinkConfig of Object.values(internalBaseDownlinks)){
					this.addDownlinkConfigByType(downlinkConfig,this.activeDownlinkConfigs);
				}
			}
			// Check if equal
			if(!isDeepStrictEqual(obj.native.downlinkConfig,ownConfig)){
				obj.native.downlinkConfig = ownConfig;
				this.adapter.log.warn("Adapter restart, because of reinit configuration");
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
			// Check for device not present
			if(!config[downlinkConfig.deviceType]){
				// override standard with userconfig
				config[downlinkConfig.deviceType] = structuredClone(downlinkConfig);
				config[downlinkConfig.deviceType].downlinkState = {};
				//Querey length of downlinkParamter
				if(config[downlinkConfig.deviceType].downlinkParameter){
					// generate downlinkstates for internal use
					for(const downlinkParameter of Object.values(config[downlinkConfig.deviceType].downlinkParameter)){
						// check name for forbidden chars
						downlinkParameter.name = downlinkParameter.name.replace(this.adapter.FORBIDDEN_CHARS,"_");
						// check the downlinkparameters for all needed attributes and generate them if undefined
						for(const attribute in this.downlinkParameterAttributs){
							if(downlinkConfig.deviceType !== this.internalDevices.baseDevice && downlinkParameter[attribute] === undefined){
								this.adapter.log.debug(`attribute ${attribute} in parameter ${downlinkParameter.name} at devicetype ${downlinkConfig.deviceType} generated`);
								downlinkParameter[attribute] = this.downlinkParameterAttributs[attribute];
							}
						}
						// assign downlinkparamter to internal structure
						config[downlinkConfig.deviceType].downlinkState[downlinkParameter.name] = downlinkParameter;
					}
				}
				else{
					this.adapter.log.warn(`the Deviceconfig with the name ${downlinkConfig.deviceType} has no downlinkstate configured`);
				}
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
		let filename;
		try{
			let myJsonArray = [];
			fs.readdirSync(directory).forEach(file => {
				filename = file;
				if(file.endsWith(".json")){
					myJsonArray = myJsonArray.concat(JSON.parse(fs.readFileSync(`${directory}/${file}`, "utf-8")));
				}
			});
			return myJsonArray;
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: Filename: ${filename} -  ` + error);
			return undefined;
		}
	}

	getBestMatchForDeviceType(changeInfo){
		const activeFunction = "checkBestMerge";
		try{
			let foundMatch = "";
			let foundLength = 0;
			for(const deviceType in this.activeDownlinkConfigs){
				if((deviceType === this.internalDevices.baseDevice && foundLength === 0) || (changeInfo.deviceType.indexOf(deviceType) === 0 && deviceType.length > foundLength)){
					foundMatch = deviceType;
					if(deviceType !== this.internalDevices.baseDevice){
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
			let downlinkParameter = undefined;
			let foundLength = 0;
			for(const deviceType in this.activeDownlinkConfigs){
				if((deviceType === this.internalDevices.baseDevice && foundLength === 0) || (changeInfo.deviceType.indexOf(deviceType) === 0 && deviceType.length > foundLength)){
					if(this.activeDownlinkConfigs[deviceType].downlinkState[changeInfo.changedState]){
						downlinkParameter = this.activeDownlinkConfigs[deviceType].downlinkState[changeInfo.changedState];
						if(deviceType !== this.internalDevices.baseDevice){
							foundLength = deviceType.length;
						}
					}
				}
			}
			if(downlinkParameter !== undefined)
			{
				return downlinkParameter;
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
				return this.getTtnDownlinkTopic(changeInfo,suffix);
			case this.adapter.origin.chirpstack:
				return this.getChirpstackDownlinkTopic(changeInfo,suffix);
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
		const crcConfig = downlinkParameter.crc? downlinkParameter.crc.split("."):["noCrc"];
		const crcAlgorithm = crcConfig[0];
		const crcSwap = crcConfig[1] === "LittleEndian" ? true : false;

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
					payloadInHex = multipliedVal.toString(16);
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
					payloadInHex = Buffer.from(state.val).toString("hex");
					numberOfDiggits = downlinkParameter.lengthInByte * 2;
					for(let index = 1; index <= numberOfDiggits; index++){
						zeroDiggits += "0";
					}
					payloadInHex = (zeroDiggits + payloadInHex).slice(-numberOfDiggits);
					payloadInHex = downlinkParameter.front + payloadInHex + downlinkParameter.end;
					break;

				case "string":
					payloadInHex = downlinkParameter.front + state.val + downlinkParameter.end;
					payloadInHex = Buffer.from(payloadInHex).toString("hex");
					break;
			}
		}
		if(crcAlgorithm && crcAlgorithm !== "noCrc"){
			let crc = crc16(crcAlgorithm,Buffer.from(payloadInHex,"hex")).toString(16);
			if(crcSwap){
				crc = Buffer.from(crc,"hex").reverse().toString("hex");
			}
			payloadInHex += crc;
		}
		return payloadInHex.toUpperCase();
	}

	/*********************************************************************
	 * **************************** TTN  *********************************
	 * ******************************************************************/

	/*********************************************************************
	 * *********************** Downlinktopic *****************************
	 * ******************************************************************/

	getTtnDownlinkTopic(changeInfo,suffix){
		this.adapter.log.silly(`the downlinktopic for ttn is requested`);
		const topicElements = {
			Version : "v3",
			applicationId : `/${changeInfo.applicationId}`,
			applicationFrom : "@ttn",
			devices : `/devices`,
			deviceId : `/${changeInfo.deviceId}`,
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

	getChirpstackDownlinkTopic(changeInfo,suffix){
		this.adapter.log.silly(`the downlinktopic for chirpstack is requested`);
		const topicElements = {
			Version : "application",
			applicationId : `/${changeInfo.applicationId}`,
			device : `/device`,
			deviceEUI : `/${changeInfo.deviceEUI}`,
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
		return 	{devEui:changeInfo.deviceEUI,confirmed:downlinkConfig.confirmed,fPort:downlinkConfig.port,data:payloadInBase64};
	}
}

module.exports = downlinkConfighandlerClass;