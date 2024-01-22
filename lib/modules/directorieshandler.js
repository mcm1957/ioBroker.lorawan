const uplinkClass = require("./uplinks/uplinks");

class directorieshandlerClass {
	constructor(adapter) {
		this.adapter = adapter;

		// used dataentries in directory structurt
		this.searchableAttributeNames = {
			apllicationId: "applicationId",
			deviceUid: "devEui",
			deviceId: "deviceId"
		};

		this.reachableSubfolders = {
			configuration: "configuration",
			uplinkDecoded: "uplink.decoded",
			uplinkRaw: "uplink.raw",
			uplinkRemaining: "uplink.remaining",
			downlinkRaw: "downlink.raw",
			downlinkConfiguration: "downlink.configuration",
			downlinkControl: "downlink.control",
			downlinkRemaining: "downlink.remaining"
		};

		this.safeableDirectories = {
			configuration: "configuration",
			uplinkDecoded: "uplinkDecoded",
			uplinkRaw: "uplinkRaw",
			uplinkRemaining: "uplinkRemaining",
			downlinkRaw: "downlinkRaw",
			downlinkConfiguration: "downlinkConfiguration",
			downlinkControl: "downlinkControl",
			downlinkRemaining: "downlinkRemaining"
		};

		this.directoryStructur = {
			downlinkNextSend: "downlink.nextSend",
			downlinkLastSend: "downlink.lastSend"
		};

		this.uplinks = new uplinkClass();

		// declare the directory structre
		this.directories = {
			application:{
				objectStateName : async (topic,message) =>{
					return await this.getAttributValue(topic,message,this.searchableAttributeNames.apllicationId);
				},
				objectCommonName: "application",
				devices:{
					deviceUid:{
						objectStateName : async (topic,message) =>{
							return await this.getAttributValue(topic,message,this.searchableAttributeNames.deviceUid);
						},
						objectCommonName: "device UID",
						deviceId:{
							objectStateName : async (topic,message) =>{
								return await this.getAttributValue(topic,message,this.searchableAttributeNames.deviceId);
							},
							objectCommonName: "device ID",
							objectType:"channel",
							configuration:{
								devicetype:{
									isState: true,
									stateCommonType: "string",
									stateCommonWrite: true
								}
							},
							uplink:{
								raw:{
								},
								decoded:{
								},
								remaining:{
								}
							},
							downlink:{
								raw:{
								},
								control:{
								},
								configuration:{
								},
								nextSend:{
									hex:{
										isState: true,
										stateCommonType: "string"
									}
								},
								lastSend:{
									hex:{
										isState: true,
										stateCommonType: "string"
									}
								},
								remaining:{
								}
							},
						},
					}
				}
			}
		};
		this.ignoredElementNames ={
			objectStateName: "objectStateName",
			objectCommonName: "objectCommonName",
			objectType: "objectType",
			stateVal: "stateVal",
			stateCommonType: "stateCommonType",
			stateCommonWrite: "stateCommonWrite",
			stateCommonUnit: "stateCommonUnit",
			isState: "isState",
			subscribe: "subscribe"
		};
	}

	/*********************************************************************
	 * *************************** General  ******************************
	 * ******************************************************************/

	/*********************************************************************
	 * ************************ Objectstring *****************************
	 * ******************************************************************/

	async generateRekursivObjects(obj,startDirectory,topic,message,options = undefined){
		const activeFunction = "generateRekursivObjects";
		try{
			// just proceed with ojects
			if(typeof obj === "object"){
				// go to every element in the object
				for(const elementName in obj){
					// Check the the elementname is not in ignored object
					// @ts-ignore
					if(!this.ignoredElementNames[elementName] && !options?.ignoredElementNames[elementName]){
						// Check if the element is an object
						if(typeof obj[elementName] === "object" && !(obj[elementName] && obj[elementName].isState)){
							// if there is an declared ObjectStateName (must be a function)=> take it
							let objectId = `${startDirectory}.${elementName}`;
							let internalObjectId = elementName;
							if(obj[elementName] && obj[elementName].objectStateName){
								internalObjectId = `${await obj[elementName].objectStateName(topic,message)}`;
								objectId = `${startDirectory}.${internalObjectId}`;
							}
							if(objectId.indexOf(".") === 0){
								objectId = objectId.substring(1,objectId.length);
							}
							await this.adapter.setObjectNotExistsAsync(objectId,{
								// @ts-ignore
								type: obj[elementName]? obj[elementName].objectType? obj[elementName].objectType : "folder" : "folder",
								common: {
									name: obj[elementName]? obj[elementName].objectCommonName? obj[elementName].objectCommonName : "" : ""
								},
								native : {},
							});
							await this.generateRekursivObjects(obj[elementName],objectId,topic,message);
						}
						else{
							let stateCommonType = typeof obj[elementName];
							let stateCommonName = "";
							let stateCommonWrite = false;
							let stateVal = obj[elementName];
							let objectId = `${startDirectory}.${elementName}`;
							let internalObjectId = elementName;
							if(obj[elementName]){
								if(obj[elementName].isState){
									stateVal = obj[elementName].stateVal !== undefined? obj[elementName].stateVal: undefined;
									stateCommonType = obj[elementName].stateCommonType? obj[elementName].stateCommonType : typeof stateVal;
									stateCommonName = obj[elementName].stateCommonName ? obj[elementName].stateCommonName : stateCommonName;
									stateCommonWrite = obj[elementName].stateCommonWrite ? obj[elementName].stateCommonWrite : stateCommonWrite;
								}
								if(obj[elementName].objectStateName){
									internalObjectId = `${await obj[elementName].objectStateName(topic,message)}`;
									objectId = `${startDirectory}.${internalObjectId}`;
								}
							}
							if(objectId.indexOf(".") === 0){
								objectId.substring(1,objectId.length);
							}
							await this.adapter.setObjectNotExistsAsync(objectId,{
								type: "state",
								common: {
									type: stateCommonType!== "object"? stateCommonType: "mixed",
									name: stateCommonName,
									role: "value",
									read: true,
									unit: obj[elementName].CommonStateUnit? obj[elementName].CommonStateUnit : this.uplinks.units[internalObjectId]? this.uplinks.units[internalObjectId] : "",
									def: stateCommonType === "boolean"? false : stateCommonType === "number"? 0: "",
									write: stateCommonWrite
								},
								native: {},
							});
							if(typeof stateVal === "object"){
								stateVal = JSON.stringify(stateVal);
							}
							if(stateVal !== undefined){
								await this.adapter.setStateAsync(`${objectId}`,stateVal,true);
							}
							if(obj[elementName].subscribe){
								this.adapter.subscribeStatesAsync(objectId);
							}
						}
					}
				}
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}

	/*********************************************************************
	 * ************************** Attribute ******************************
	 * ******************************************************************/

	async getAttributValue(topic,message,resolvetype){
		const activeFunction = "getAttributValue";
		try{
			// Select search in case of origin
			switch(this.adapter.config.origin){
				case "ttn":
					return await this.getTtnAttributValue(topic,message,resolvetype);
				case "chirpstack":
					return await this.getChirpstackAttributValue(topic,message,resolvetype);
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}

	/*********************************************************************
	 * ************************ Object Directory *************************
	 * ******************************************************************/

	async getObjectDirectory(topic,message,resolvetype){
		const activeFunction = "getObjectDirectory";
		try{
			// Select search in case of origin
			switch(this.adapter.config.origin){
				case "ttn":
					return await this.getTtnObjectDirectory(topic,message,resolvetype);
				case "chirpstack":
					return await this.getChirpstackObjectDirectory(topic,message,resolvetype);
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}

	/*********************************************************************
	 * *********************** Topic resolved ****************************
	 * ******************************************************************/
	getTopicResolved(topic){
		const activeFunction = "getTopicResolved";
		try{
			this.adapter.log.silly(`topic ${topic} is requested for resolveing`);
			// Select in case of origin
			switch(this.adapter.config.origin){
				case "ttn":
					return this.getTtnTopicResolved(topic);
				case "chirpstack":
					return this.getChirpstackTopicResolved(topic);
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Topic: " + JSON.stringify(topic));
		}
	}

	/*********************************************************************
	 * **************************** TTN  *********************************
	 * ******************************************************************/

	/*********************************************************************
	 * ************************** Attribute ******************************
	 * ******************************************************************/

	async getTtnAttributValue(topic,message,resolvetype){
		const activeFunction = "getTtnAttributValue";
		try{
			this.adapter.log.silly(`attribute ${resolvetype} is requested for ttn`);
			const topicResolved =  this.getTopicResolved(topic);
			switch(resolvetype){
				case this.searchableAttributeNames.apllicationId:
					return topicResolved?.applicationId;

				case this.searchableAttributeNames.deviceUid:
					return message.end_device_ids.dev_eui;

				case this.searchableAttributeNames.deviceId:
					return topicResolved?.deviceId;

				default:
					this.adapter.log.warn(`No attribute with the name ${resolvetype} found.`);
					return "";
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}

	/*********************************************************************
	 * ************************ Object Directory *************************
	 * ******************************************************************/

	async getTtnObjectDirectory(topic,message,resolvetype){
		const activeFunction = "getTtnObjectDirectory";
		try{
			this.adapter.log.silly(`directory ${resolvetype} is requested for ttn`);
			const topicResolved =  this.getTopicResolved(topic);
			if(typeof message !== "string"){
				switch(resolvetype){
					case this.searchableAttributeNames.deviceId:
						return `${topicResolved?.applicationId}.devices.${message.end_device_ids.dev_eui}.${topicResolved?.deviceId}`;

					default:
						return message;
				}
			}
			else{
				return message;
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}

	/*********************************************************************
	 * ************************ Object Directory *************************
	 * ******************************************************************/

	getTtnTopicResolved(topic){
		const activeFunction = "getTtnTopicResolved";
		try{
			const topicElements = topic.split("/");
			const topicResolved = {
				applicationId: topicElements[1],
				deviceId: topicElements[3],
				messageType: topicElements[topicElements.length - 1]
			};
			// clean up application id
			const indexOfOrigin = topicResolved.applicationId.indexOf("@");
			if(indexOfOrigin !== -1){
				topicResolved.applicationId = topicResolved.applicationId.substring(0,indexOfOrigin);
			}
			return topicResolved;
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Topic: " + JSON.stringify(topic));
		}
	}



	/*********************************************************************
	 * ************************ Chirpstack  ******************************
	 * ******************************************************************/

	/*********************************************************************
	 * ************************** Attribute ******************************
	 * ******************************************************************/


	async getChirpstackAttributValue(topic,message,resolvetype){
		const activeFunction = "getChirpstackAttributValue";
		try{
			this.adapter.log.silly(`attribute ${resolvetype} is requested for chirpstack`);
			const topicResolved =  this.getTopicResolved(topic);
			let devId = undefined;
			switch(resolvetype){
				case this.searchableAttributeNames.apllicationId:
					return topicResolved?.applicationId;

				case this.searchableAttributeNames.deviceUid:
					return topicResolved?.deviceUid;

				case this.searchableAttributeNames.deviceId:
					if(topicResolved?.messageType === "up"){
						devId = message.deviceInfo.deviceName;
					}
					else if(topicResolved?.messageType === "down")
					{
						const adapterObjectsAtStart = await this.adapter.getAdapterObjectsAsync();
						for(const adapterObject of Object.values(adapterObjectsAtStart)){
							if(adapterObject.type === "channel" && adapterObject.common.name !== "Information"){
								adapterObject._id = this.adapter.removeNamespace(adapterObject._id);
								const baseDeviceInfo = this.adapter.getBaseDeviceInfo(`${adapterObject._id}.deviceInfo`);
								if(baseDeviceInfo.obectStartDirectory === adapterObject._id){
									devId = baseDeviceInfo.device_id;
									break;
								}
							}
						}
					}
					return devId;

				default:
					this.adapter.log.warn(`No attribute with the name ${resolvetype} found.`);
					return "";
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}

	/*********************************************************************
	 * ************************ Object Directory *************************
	 * ******************************************************************/

	async getChirpstackObjectDirectory(topic,message,resolvetype){
		const activeFunction = "getChirpstackObjectDirectory";
		try{
			this.adapter.log.silly(`directory ${resolvetype} is requested for chirpstack`);
			const topicResolved =  this.getTopicResolved(topic);
			let devUid = undefined;
			if(topicResolved?.messageType === "up"){
				devUid = message.deviceInfo.devEui;
			}
			else if(topicResolved?.messageType === "down")
			{
				devUid = message.devEui;
			}
			if(devUid !== undefined){
				if(typeof message !== "string"){
					switch(resolvetype){
						case this.searchableAttributeNames.deviceId:
							return `${topicResolved?.applicationId}.devices.${devUid}.${await this.getChirpstackAttributValue(topic,message,this.searchableAttributeNames.deviceId)}`; // Hier muss die device id rein. (mussnoch mit async geholt werden)

						default:
							return message;
					}
				}
				else{
					return message;
				}
			}
			else{
				this.adapter.log.warn(`no devEui found in message`);
				this.adapter.log.warn(`message: ${message}`);
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}

	/*********************************************************************
	 * ************************ Resolved Topic ***************************
	 * ******************************************************************/

	getChirpstackTopicResolved(topic){
		const activeFunction = "getChirpstackTopicResolved";
		try{
			const topicElements = topic.split("/");
			const topicResolved = {
				applicationId: topicElements[1],
				deviceUid: topicElements[3],
				messageType: topicElements[topicElements.length - 1]
			};
			// clean up application id
			const indexOfOrigin = topicResolved.applicationId.indexOf("@");
			if(indexOfOrigin !== -1){
				topicResolved.applicationId = topicResolved.applicationId.substring(0,indexOfOrigin);
			}
			return topicResolved;
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Topic: " + JSON.stringify(topic));
		}
	}
}

module.exports = directorieshandlerClass;