const uplinkClass = require("./uplinks/uplinks");

class messagehandlerClass {
	constructor(adapter) {
		this.adapter = adapter;

		// used dataentries in directory structurt
		this.searchableAttributeNames = {
			apllicationId: "applicationId",
			deviceUid: "devEui",
			deviceId: "deviceId"
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

		this.reachableDirectories = {};

		this.uplinks = new uplinkClass();

		// declare the directory structre
		this.directories = {
			application:{
				objectStateName : (message) =>{
					return this.getAttributValue(message,this.searchableAttributeNames.apllicationId);
				},
				objectCommonName: "application",
				devices:{
					deviceUid:{
						objectStateName : (message) =>{
							return this.getAttributValue(message,this.searchableAttributeNames.deviceUid);
						},
						objectCommonName: "device UID",
						deviceId:{
							objectStateName : (message) =>{
								return this.getAttributValue(message,this.searchableAttributeNames.deviceId);
							},
							objectCommonName: "device ID",
							objectType:"channel",
							configuration:{
								safeDirectory: this.safeableDirectories.configuration,
								devicetype:{
									isState: true,
									stateCommonType: "string",
									stateCommonWrite: true,
								}
							},
							uplink:{
								raw:{
									safeDirectory: this.safeableDirectories.uplinkRaw
								},
								decoded:{
									safeDirectory: this.safeableDirectories.uplinkDecoded
								},
								remaining:{
									safeDirectory: this.safeableDirectories.uplinkRemaining
								}
							},
							downlink:{
								raw:{
									safeDirectory: this.safeableDirectories.downlinkRaw
								},
								control:{
									safeDirectory: this.safeableDirectories.downlinkControl
								},
								configuration:{
									safeDirectory: this.safeableDirectories.downlinkConfiguration,
								},
								remaining:{
									safeDirectory: this.safeableDirectories.downlinkRemaining
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
			safeDirectory: "safeDirectory",
			subscribe: "subscribe"
		};
	}

	/*********************************************************************
	 * *************************** General  ******************************
	 * ******************************************************************/

	/*********************************************************************
	 * ************************ Objectstring *****************************
	 * ******************************************************************/

	async generateRekursivObjects(obj,startDirectory,message,options = undefined){
		// just proceed with ojects
		if(typeof obj === "object"){
			// go to every element in the object
			for(const elementName in obj){
				// Check the the elementname is not in ignored object
				// @ts-ignore
				if(!this.ignoredElementNames[elementName] && !options?.ignoredElementNames[elementName]){
					// Check if the element is an object
					if(typeof obj[elementName] === "object" && !obj[elementName].isState){
						// if there is an declared ObjectStateName (must be a function)=> take it
						let objectId = `${startDirectory}.${elementName}`;
						let internalObjectId = elementName;
						if(obj[elementName].objectStateName){
							internalObjectId = `${obj[elementName].objectStateName(message)}`;
							objectId = `${startDirectory}.${internalObjectId}`;
						}
						if(objectId.indexOf(".") === 0){
							objectId = objectId.substring(1,objectId.length);
						}
						if(obj[elementName].safeDirectory){
							if(!this.reachableDirectories){
								this.reachableDirectories = {};
							}
							if(!this.reachableDirectories[this.getObjectDirectory(message,this.searchableAttributeNames.deviceId)]){
								this.reachableDirectories[this.getObjectDirectory(message,this.searchableAttributeNames.deviceId)] = {};
							}
							this.reachableDirectories[this.getObjectDirectory(message,this.searchableAttributeNames.deviceId)][obj[elementName].safeDirectory] = objectId;
						}
						await this.adapter.setObjectNotExistsAsync(objectId,{
							// @ts-ignore
							type: obj[elementName].objectType? obj[elementName].objectType : "folder",
							common: {
								name: obj[elementName].objectCommonName? obj[elementName].objectCommonName : ""
							},
							native : {},
						});
						await this.generateRekursivObjects(obj[elementName],objectId,message);
					}
					else{
						let stateCommonType = typeof obj[elementName];
						let stateCommonName = "";
						let stateCommonWrite = false;
						let stateVal = obj[elementName];
						if(obj[elementName].isState){
							stateVal = obj[elementName].stateVal !== undefined? obj[elementName].stateVal: undefined;
							stateCommonType = obj[elementName].stateCommonType? obj[elementName].stateCommonType : typeof stateVal;
							stateCommonName = obj[elementName].stateCommonName ? obj[elementName].stateCommonName : stateCommonName;
							stateCommonWrite = obj[elementName].stateCommonWrite ? obj[elementName].stateCommonWrite : stateCommonWrite;
						}
						let objectId = `${startDirectory}.${elementName}`;
						let internalObjectId = elementName;
						if(obj[elementName].objectStateName){
							internalObjectId = `${obj[elementName].objectStateName(message)}`;
							objectId = `${startDirectory}.${internalObjectId}`;
						}
						if(objectId.indexOf(".") === 0){
							objectId.substring(1,objectId.length);
						}
						await this.adapter.setObjectNotExistsAsync(objectId,{
							type: "state",
							common: {
								type: stateCommonType,
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

	/*********************************************************************
	 * ************************** Attribute ******************************
	 * ******************************************************************/

	getAttributValue(message,resolvetype){
		// Select search in case of origin
		if(this.adapter.config.origin === "ttn"){
			return this.getTtnAttributValue(message,resolvetype);
		}
		else if(this.adapter.config.origin === "chirpstack"){
			return this.getChirpstackAttributValue(message,resolvetype);
		}
	}

	/*********************************************************************
	 * ************************ Object Directory *************************
	 * ******************************************************************/

	getObjectDirectory(message,resolvetype){
		// Select search in case of origin
		if(this.adapter.config.origin === "ttn"){
			return this.getTtnObjectDirectory(message,resolvetype);
		}
		else if(this.adapter.config.origin === "chirpstack"){
			return this.getChirpstackObjectDirectory(message,resolvetype);
		}
	}




	/*********************************************************************
	 * **************************** TTN  *********************************
	 * ******************************************************************/

	/*********************************************************************
	 * ************************** Attribute ******************************
	 * ******************************************************************/

	getTtnAttributValue(message,resolvetype){
		switch(resolvetype){
			case this.searchableAttributeNames.apllicationId:
				return message.end_device_ids.application_ids.application_id;

			case this.searchableAttributeNames.deviceUid:
				return message.end_device_ids.dev_eui;

			case this.searchableAttributeNames.deviceId:
				return message.end_device_ids.device_id;

			default:
				this.adapter.log.warn(`No attribute with the name ${resolvetype} found.`);
				return "";
		}
	}

	/*********************************************************************
	 * ************************ Object Directory *************************
	 * ******************************************************************/

	getTtnObjectDirectory(message,resolvetype){
		if(typeof message !== "string"){
			switch(resolvetype){
				case this.searchableAttributeNames.deviceId:
					return `${message.end_device_ids.application_ids.application_id}.devices.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}`;

				default:
					return message;
			}
		}
		else{
			return message;
		}
	}





	/*********************************************************************
	 * ************************ Chirpstack  ******************************
	 * ******************************************************************/

	/*********************************************************************
	 * ************************** Attribute ******************************
	 * ******************************************************************/


	getChirpstackAttributValue(message,resolvetype){
		switch(resolvetype){
			case this.searchableAttributeNames.apllicationId:
				return message.deviceInfo.applicationId;

			case this.searchableAttributeNames.deviceUid:
				return message.deviceInfo.devEui;

			case this.searchableAttributeNames.deviceId:
				return message.deviceInfo.deviceName;

			default:
				this.adapter.log.warn(`No attribute with the name ${resolvetype} found.`);
				return "";
		}
	}

	/*********************************************************************
	 * ************************ Object Directory *************************
	 * ******************************************************************/

	getChirpstackObjectDirectory(message,resolvetype){
		if(typeof message !== "string"){
			switch(resolvetype){
				case this.searchableAttributeNames.deviceId:
					return `${message.deviceInfo.applicationId}.devices.${message.deviceInfo.devEui}.${message.deviceInfo.deviceName}`;

				default:
					return message;
			}
		}
		else{
			return message;
		}
	}
}

module.exports = messagehandlerClass;