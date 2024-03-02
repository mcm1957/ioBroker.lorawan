const { isDeepStrictEqual } = require("util");

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

		/*********************************************************************
		 * ********************* Definition of Assigns  **********************
		 * ******************************************************************/

		// Definition of Assign timestamps
		this.timestringToDate = (value,common) =>{
			common.role = "date";
			if(typeof value === "string"){
				common.type = "number";
				return new Date(value).valueOf();
			}
			else{
				return value;
			}
		};

		// Assign definitions for special states
		this.assigns = {
			time: this.timestringToDate,
			gwTime: this.timestringToDate,
			nsTime: this.timestringToDate,
			timestamp: this.timestringToDate
		};

		/*********************************************************************
		 * ************************** writecommands  *************************
		 * ******************************************************************/

		//general function for writecommands
		this.executeWritecommand = async (writecommand,elementName,sourceId,value) =>{
			// Check, if there is a writetrigger and the stateval is not euqal its releaseVal(still present)
			if(writecommand.releaseValue !== value){
				const baseInfo = this.adapter.getBaseDeviceInfo(sourceId);
				const subfolder = sourceId.slice(baseInfo.objectStartDirectory.length + 1,sourceId.length - baseInfo.changedState.length - 1);
				if(!writecommand.approvedFolders || writecommand.approvedFolders[subfolder]){
					const destinationId = `${baseInfo.objectStartDirectory}.${writecommand.destination}`;
					const destinationState = await this.adapter.getStateAsync(destinationId);
					if(destinationState?.val === writecommand.releaseValue){
						this.adapter.log.debug(`writecommand ${elementName} recogniced. value ${value} will be written into ${writecommand.destination}`);
						await this.adapter.setStateAsync(destinationId,value);
					}
				}
			}
		};

		// Define settings for writecommand devicetype
		this.writeCommandDeviceType = async (elementName,sourceId,value) =>{
			const writecommand = {destination:"configuration.devicetype",releaseValue:"",approvedFolders:{"uplink.decoded":true}};
			return await this.executeWritecommand(writecommand,elementName,sourceId,value);
		};

		this.writeCommand = {
			Devicetype: this.writeCommandDeviceType,
			devicetype: this.writeCommandDeviceType,
			Device: this.writeCommandDeviceType,
			device: this.writeCommandDeviceType,
			Hardware_mode: this.writeCommandDeviceType,
			Hardware_Mode: this.writeCommandDeviceType
		};

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
							const common = {
								type: typeof obj[elementName],
								name: "",
								role: "value",
								unit: obj[elementName]? obj[elementName].CommonStateUnit? obj[elementName].CommonStateUnit : "" : "",
								write: false
							};
							let stateVal = obj[elementName];
							let objectId = `${startDirectory}.${elementName}`;
							let internalObjectId = elementName;
							if(obj[elementName]){
								if(obj[elementName].isState){
									stateVal = obj[elementName].stateVal !== undefined? obj[elementName].stateVal: undefined;
									common.type = obj[elementName].stateCommonType? obj[elementName].stateCommonType : typeof stateVal;
									common.name = obj[elementName].stateCommonName ? obj[elementName].stateCommonName : common.name;
									common.write = obj[elementName].stateCommonWrite ? obj[elementName].stateCommonWrite : common.write;
									common.role = obj[elementName].stateCommonRole ? obj[elementName].stateCommonRole : common.role;
								}
								if(obj[elementName].objectId){
									internalObjectId = `${obj[elementName].objectId(topic,message)}`;
									objectId = `${startDirectory}.${internalObjectId}`;
								}
							}
							// Check for id dont starts with "."
							if(objectId.indexOf(".") === 0){
								objectId.substring(1,objectId.length);
							}
							// Check for an assign definition (calculation and / or role assignment)
							if(this.assigns[elementName]){
								stateVal = this.assigns[elementName](stateVal,common);
							}
							common.read = common.role !== "button";
							common.def = obj[elementName] || typeof obj[elementName] === "boolean" ? obj[elementName].stateCommonDef? obj[elementName].stateCommonDef: common.type === "boolean"? false : common.type === "number"? 0: "": common.type === "number"? 0: "";
							await this.adapter.extendObjectAsync(objectId,{
								type: "state",
								common: common,
								native: {},
							});
							if(typeof stateVal === "object"){
								stateVal = JSON.stringify(stateVal);
							}
							if(stateVal !== undefined){
								// Set State from Objectpath
								await this.adapter.setStateAsync(`${objectId}`,stateVal,true);
								//Check for writecommand
								if(this.writeCommand[elementName]){
									await this.writeCommand[elementName](elementName,objectId,stateVal);
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