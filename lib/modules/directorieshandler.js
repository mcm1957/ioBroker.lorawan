const fs = require("fs");

class directorieshandlerClass {
	constructor(adapter) {
		this.adapter = adapter;

		// used dataentries in directory structurt
		this.searchableAttributeNames = {
			apllicationId: "applicationId",
			deviceEUI: "devEui",
			deviceId: "deviceId"
		};

		this.reachableSubfolders = {
			configuration: "configuration",
			uplink: "uplink",
			uplinkDecoded: "uplink.decoded",
			uplinkRaw: "uplink.raw",
			uplinkRemaining: "uplink.remaining",
			downlink: "downlink",
			downlinkRaw: "downlink.raw",
			downlinkControl: "downlink.control",
			downlinkRemaining: "downlink.remaining",
			downlinkNextSend: "downlink.nextSend",
			downlinkLastSend: "downlink.lastSend"
		};

		//define path for uplink roles
		this.uplinkRolesPath = "/lib/modules/roles/uplinks.json";

		// get roles
		this.uplinkRoles = this.getJsonFromDirectoryfile(`${this.adapter.adapterDir}${this.uplinkRolesPath}`);

		// declare the directory structre
		this.directories = {
			application:{
				objectStateId : async (topic,message) =>{
					return await this.getAttributValue(topic,message,this.searchableAttributeNames.apllicationId);
				},
				objectCommonName: "application",
				devices:{
					deviceEUI:{
						objectStateId : async (topic,message) =>{
							return await this.getAttributValue(topic,message,this.searchableAttributeNames.deviceEUI);
						},
						objectCommonName: async (topic,message) =>{
							return await this.getAttributValue(topic,message,this.searchableAttributeNames.deviceId);
						},
						objectType: "device",
						configuration:{
							devicetype:{
								isState: true,
								stateCommonType: "string",
								stateCommonWrite: true,
								stateCommonRole: "text"
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
							nextSend:{
								hex:{
									isState: true,
									stateCommonDef: "0",
									stateCommonType: "string",
								}
							},
							lastSend:{
								hex:{
									isState: true,
									stateCommonDef: "0",
									stateCommonType: "string"
								}
							},
							remaining:{
							}
						},
					}
				}
			}
		};
		this.ignoredElementNames ={
			objectStateId: "objectStateId",
			objectCommonName: "objectCommonName",
			objectType: "objectType"
		};
	}

	/*********************************************************************
	 * *************************** General  ******************************
	 * ******************************************************************/

	/*********************************************************************
	 * **************************** Roles ********************************
	 * ******************************************************************/

	getJsonFromDirectoryfile(file){
		const activeFunction = "getJsonFromDirectoryfiles";
		this.adapter.log.silly(`the file ${file} will be readout`);
		try{
			return JSON.parse(fs.readFileSync(file, "utf-8"));
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			return undefined;
		}
	}

	/*********************************************************************
	 * ************************ Objectstring *****************************
	 * ******************************************************************/

	async generateRekursivObjects(obj,startDirectory,topic,message,options){
		const activeFunction = "generateRekursivObjects";
		try{
			// just proceed with ojects
			if(typeof obj === "object"){
				// go to every element in the object
				for(const elementName in obj){
					// Check the the elementname is not in ignored object
					if(!this.ignoredElementNames[elementName] && !options?.ignoredElementNames[elementName]){
						// Check if the element is an object
						if(typeof obj[elementName] === "object" && obj[elementName] && !obj[elementName].isState){
							// if there is an declared ObjectStateName (must be a function)=> take it
							let objectId = `${startDirectory}.${elementName}`;
							let internalObjectId = elementName;
							if(obj[elementName].objectStateId){
								internalObjectId = `${await obj[elementName].objectStateId(topic,message)}`;
								objectId = `${startDirectory}.${internalObjectId}`;
							}
							if(objectId.indexOf(".") === 0){
								objectId = objectId.substring(1,objectId.length);
							}
							let objectCommonName = "";
							if(obj[elementName].objectCommonName && typeof obj[elementName].objectCommonName === "function"){
								objectCommonName = await obj[elementName].objectCommonName(topic,message);
								await this.adapter.extendObject(objectId,{
									type: obj[elementName].objectType? obj[elementName].objectType : "folder",
									common: {
										name: objectCommonName
									},
									native : {},
								});
							}
							else{
								if(obj[elementName].objectCommonName){
									objectCommonName = obj[elementName].objectCommonName;
								}
								await this.adapter.setObjectNotExistsAsync(objectId,{
									type: obj[elementName].objectType? obj[elementName].objectType : "folder",
									common: {
										name: objectCommonName
									},
									native : {},
								});
							}
							// Jump into next step (next directory / attribute)
							await this.generateRekursivObjects(obj[elementName],objectId,topic,message);
						}
						else{
							let stateCommonType = typeof obj[elementName];
							let stateCommonName = "";
							let stateCommonWrite = false;
							let stateCommonRole = "value";
							let stateVal = obj[elementName];
							let objectId = `${startDirectory}.${elementName}`;
							let internalObjectId = elementName;
							if(obj[elementName]){
								if(obj[elementName].isState){
									stateVal = obj[elementName].stateVal !== undefined? obj[elementName].stateVal: undefined;
									stateCommonType = obj[elementName].stateCommonType? obj[elementName].stateCommonType : typeof stateVal;
									stateCommonName = obj[elementName].stateCommonName ? obj[elementName].stateCommonName : stateCommonName;
									stateCommonWrite = obj[elementName].stateCommonWrite ? obj[elementName].stateCommonWrite : stateCommonWrite;
									stateCommonRole = obj[elementName].stateCommonRole ? obj[elementName].stateCommonRole : stateCommonRole;
								}
								if(obj[elementName].objectStateId){
									internalObjectId = `${await obj[elementName].objectStateId(topic,message)}`;
									objectId = `${startDirectory}.${internalObjectId}`;
								}
							}
							if(this.uplinkRoles[elementName]){
								stateCommonRole = this.uplinkRoles[elementName];
							}
							if(objectId.indexOf(".") === 0){
								objectId.substring(1,objectId.length);
							}
							await this.adapter.setObjectNotExistsAsync(objectId,{
								type: "state",
								common: {
									type: stateCommonType !== undefined? stateCommonType!== "object"? stateCommonType: "mixed": "mixed",
									name: stateCommonName,
									role: stateCommonRole,
									read: stateCommonRole !== "button",
									unit: obj[elementName]? obj[elementName].CommonStateUnit? obj[elementName].CommonStateUnit : "" : "",
									def: obj[elementName]? obj[elementName].stateCommonDef? obj[elementName].stateCommonDef: stateCommonType === "boolean"? false : stateCommonType === "number"? 0: "": stateCommonType === "number"? 0: "",
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
						}
					}
				}
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
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
				case this.adapter.origin.ttn:
					return await this.getTtnAttributValue(topic,message,resolvetype);
				case this.adapter.origin.chirpstack:
					return await this.getChirpstackAttributValue(topic,message,resolvetype);
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
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
				case this.adapter.origin.ttn:
					return await this.getTtnObjectDirectory(topic,message,resolvetype);
				case this.adapter.origin.chirpstack:
					return await this.getChirpstackObjectDirectory(topic,message,resolvetype);
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
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
				case this.adapter.origin.ttn:
					return this.getTtnTopicResolved(topic);
				case this.adapter.origin.chirpstack:
					return this.getChirpstackTopicResolved(topic);
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
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

				case this.searchableAttributeNames.deviceEUI:
					return message.end_device_ids.dev_eui;

				case this.searchableAttributeNames.deviceId:
					return topicResolved?.deviceId;

				default:
					this.adapter.log.warn(`No attribute with the name ${resolvetype} found.`);
					return "";
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
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
					case this.searchableAttributeNames.deviceEUI:
						return `${topicResolved?.applicationId}.devices.${message.end_device_ids.dev_eui}`;

					default:
						return message;
				}
			}
			else{
				return message;
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
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
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
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
			switch(resolvetype){
				case this.searchableAttributeNames.apllicationId:
					return topicResolved?.applicationId;

				case this.searchableAttributeNames.deviceEUI:
					return topicResolved?.deviceEUI;

				case this.searchableAttributeNames.deviceId:
					return message.deviceInfo.deviceName;

				default:
					this.adapter.log.warn(`No attribute with the name ${resolvetype} found.`);
					return "";
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
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
			if(topicResolved?.messageType !== "down"){
				devUid = message.deviceInfo.devEui;
			}
			else{
				devUid = message.devEui;
			}
			switch(resolvetype){
				case this.searchableAttributeNames.deviceEUI:
					return `${topicResolved?.applicationId}.devices.${devUid}`;

				default:
					return message;
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
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
				deviceEUI: topicElements[3],
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
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
		}
	}
}

module.exports = directorieshandlerClass;