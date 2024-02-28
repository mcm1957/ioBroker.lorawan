const { isDeepStrictEqual } = require("util");
const fs = require("fs");

class directorieshandlerClass {
	constructor(adapter) {
		this.adapter = adapter;

		// used dataentries in directory structurt
		this.searchableAttributeNames = {
			applicationId: "applicationId",
			applicationName: "applicationName",
			deviceEUI: "deviceEui",
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
			downlinkLastSend: "downlink.lastSend",
			join: "join",
			joinRaw: "join.raw"
		};

		//define path for uplink roles
		this.uplinkRolesPath = "/lib/modules/roles/uplinks.json";

		// get roles
		this.uplinkRoles = this.getJsonFromDirectoryfile(`${this.adapter.adapterDir}${this.uplinkRolesPath}`);

		//define path for devicetype difinitions
		this.devicetypeDefinitionsPath = "/lib/modules/roles/devicetype.json";

		// get devicetype definitions
		this.devicetypeDefinitions = this.getJsonFromDirectoryfile(`${this.adapter.adapterDir}${this.devicetypeDefinitionsPath}`);

		// declare the directory structre
		this.directories = {
			application:{
				objectId : (topic,message) =>{
					return this.getAttributValue(topic,message,this.searchableAttributeNames.applicationId);
				},
				objectCommonFromNative: {name:"applicationName"},
				objectNative : (topic,message) =>{
					return {
						applicationName : this.getAttributValue(topic,message,this.searchableAttributeNames.applicationName)
					};
				},
				devices:{
					deviceEUI:{
						objectId : (topic,message) =>{
							return this.getAttributValue(topic,message,this.searchableAttributeNames.deviceEUI);
						},
						objectCommonFromNative: {name:"deviceId"},
						objectNative : (topic,message) =>{
							return {
								applicationName : this.getAttributValue(topic,message,this.searchableAttributeNames.applicationName),
								deviceId : this.getAttributValue(topic,message,this.searchableAttributeNames.deviceId)
							};
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
						join:{
							raw:{
							}
						}
					}
				}
			}
		};
		this.ignoredElementNames ={
			objectId: "objectId",
			objectCommonName: "objectCommonName",
			objectCommonFromNative: "objectCommonFromNative",
			objectType: "objectType",
			objectNative : "objectNative"
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
							// Generate the desired id
							let objectId = `${startDirectory}.${elementName}`;
							let internalObjectId = elementName;
							if(obj[elementName].objectId){
								internalObjectId = `${obj[elementName].objectId(topic,message)}`;
								objectId = `${startDirectory}.${internalObjectId}`;
							}
							if(objectId.indexOf(".") === 0){
								objectId = objectId.substring(1,objectId.length);
							}
							let myObject = {};
							// check object exists
							if(await this.adapter.objectExists(objectId)){
								this.adapter.log.silly(`get object ${objectId}`);
								myObject = await this.adapter.getObjectAsync(objectId);
							}
							else{
								this.adapter.log.silly(`object ${objectId} not exists`);
							}
							const myObjectBefore = structuredClone(myObject);

							//Set type of object
							if(!myObject.type){
								myObject.type = obj[elementName].objectType? obj[elementName].objectType : "folder";
							}

							//check for common
							if(!myObject.common){
								myObject.common = {};
							}

							// check whether a common name was specified
							if(obj[elementName].objectCommonName && typeof obj[elementName].objectCommonName === "function"){
								if(typeof obj[elementName].objectCommonName === "function"){
									myObject.common.name = obj[elementName].objectCommonName(topic,message);
								}
								else{
									myObject.common.name = obj[elementName].objectCommonName;
								}
							}

							// Check wheter a native content was specified
							if(!myObject.native){
								myObject.native = {};
							}
							if(obj[elementName].objectNative){
								const objectNative = obj[elementName].objectNative(topic,message);
								for(const attribute in objectNative){
									myObject.native[attribute] = objectNative[attribute];
								}

								// Assigne to common, if there are values specified
								if(obj[elementName].objectCommonFromNative){
									for(const attribute in obj[elementName].objectCommonFromNative){
										// Check, whether the actual native is present
										if(myObject.native[obj[elementName].objectCommonFromNative[attribute]]){
											// check for old common => existing object
											if(myObjectBefore.common){
												//check for content
												if(myObjectBefore.common[attribute] === myObjectBefore.native[obj[elementName].objectCommonFromNative[attribute]] ||
												myObjectBefore.common[attribute] === ""){
													this.adapter.log.silly(`set common attribut ${attribute} to ${myObject.native[obj[elementName].objectCommonFromNative[attribute]]}`);
													myObject.common[attribute] = myObject.native[obj[elementName].objectCommonFromNative[attribute]];
												}
											}
											else{
												this.adapter.log.silly(`set common attribut ${attribute} to ${myObject.native[obj[elementName].objectCommonFromNative[attribute]]}`);
												myObject.common[attribute] = myObject.native[obj[elementName].objectCommonFromNative[attribute]];
											}
										}
									}
								}
							}
							// Check for name
							if(!myObject.common.name){
								myObject.common.name = "";
							}
							if(!isDeepStrictEqual(myObject,myObjectBefore)){
								this.adapter.log.debug(`set object ${objectId}`);
								await this.adapter.setObject(objectId,myObject);
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
								if(obj[elementName].objectId){
									internalObjectId = `${obj[elementName].objectId(topic,message)}`;
									objectId = `${startDirectory}.${internalObjectId}`;
								}
							}
							// Check for roles
							if(this.uplinkRoles[elementName]){
								stateCommonRole = this.uplinkRoles[elementName];
							}
							// Check for id dont starts with "."
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
									def: obj[elementName] || typeof obj[elementName] === "boolean" ? obj[elementName].stateCommonDef? obj[elementName].stateCommonDef: stateCommonType === "boolean"? false : stateCommonType === "number"? 0: "": stateCommonType === "number"? 0: "",
									write: stateCommonWrite
								},
								native: {},
							});
							if(typeof stateVal === "object"){
								stateVal = JSON.stringify(stateVal);
							}
							if(stateVal !== undefined){
								await this.adapter.setStateAsync(`${objectId}`,stateVal,true);
								if(this.devicetypeDefinitions[elementName]){
									await this.setDevicetypeDefinition(objectId,stateVal);
								}
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
	 * ******************** Devicetype definition ************************
	 * ******************************************************************/

	async setDevicetypeDefinition(devicetypeId,stateVal){
		const changeInfo = await this.adapter.getChangeInfo(devicetypeId);
		if(changeInfo?.deviceType === ""){
			const myId = `${changeInfo?.objectStartDirectory}.${this.adapter.messagehandler?.directoryhandler.reachableSubfolders.configuration}.devicetype`;
			await this.adapter.setStateAsync(myId,stateVal);
		}
	}

	/*********************************************************************
	 * ************************** Attribute ******************************
	 * ******************************************************************/

	getAttributValue(topic,message,resolvetype){
		const activeFunction = "getAttributValue";
		try{
			// Select search in case of origin
			switch(this.adapter.config.origin){
				case this.adapter.origin.ttn:
					return this.getTtnAttributValue(topic,message,resolvetype);
				case this.adapter.origin.chirpstack:
					return this.getChirpstackAttributValue(topic,message,resolvetype);
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
		}
	}

	/*********************************************************************
	 * ******************** Object Start Directory ***********************
	 * ******************************************************************/

	getDeviceStartDirectory(topic,message){
		const activeFunction = "getDeviceStartDirectory";
		try{
			const applicationId = `${this.getAttributValue(topic,message,this.searchableAttributeNames.applicationId)}`;
			const deviceEUI = `${this.getAttributValue(topic,message,this.searchableAttributeNames.deviceEUI)}`;
			return `${applicationId}.devices.${deviceEUI}`;
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

	getTtnAttributValue(topic,message,resolvetype){
		const activeFunction = "getTtnAttributValue";
		try{
			this.adapter.log.silly(`attribute ${resolvetype} is requested for ttn`);
			const topicResolved =  this.getTopicResolved(topic);
			switch(resolvetype){
				case this.searchableAttributeNames.applicationId:
					return topicResolved?.applicationId;

				case this.searchableAttributeNames.applicationName:
					return topicResolved?.applicationName;

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

	getTtnTopicResolved(topic){
		const activeFunction = "getTtnTopicResolved";
		try{
			const topicElements = topic.split("/");
			const topicResolved = {
				applicationName: "",
				applicationId: topicElements[1],
				deviceId: topicElements[3],
				messageType: topicElements[topicElements.length - 1]
			};
			// clean up application id
			const indexOfOrigin = topicResolved.applicationId.indexOf("@");
			if(indexOfOrigin !== -1){
				topicResolved.applicationName = topicResolved.applicationId;
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


	// !!! Dont use resoletypes with message.deviceInfo in down => No deviceInfo in down message present
	getChirpstackAttributValue(topic,message,resolvetype){
		const activeFunction = "getChirpstackAttributValue";
		try{
			this.adapter.log.silly(`attribute ${resolvetype} is requested for chirpstack`);
			const topicResolved =  this.getTopicResolved(topic);
			switch(resolvetype){
				case this.searchableAttributeNames.applicationId:
					return topicResolved?.applicationId;

				case this.searchableAttributeNames.applicationName:
					return message.deviceInfo.applicationName;

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
			return topicResolved;
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Topic: ${JSON.stringify(topic)}`);
		}
	}
}

module.exports = directorieshandlerClass;