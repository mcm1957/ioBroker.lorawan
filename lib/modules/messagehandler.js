const directorieshandlerClass = require("./directorieshandler");

class messagehandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		this.directoryhandler = new directorieshandlerClass(this.adapter);

		//define path for uplink roles
		this.downlinkRolesPath = "/lib/modules/roles/downlinks.json";

		// get roles
		this.downlinkRoles = this.directoryhandler.getJsonFromDirectoryfile(`${this.adapter.adapterDir}${this.downlinkRolesPath}`);
	}


	/*********************************************************************
	 * *************************** General  ******************************
	 * ******************************************************************/

	async handleMessage(topic,message){
		// Select datahandling in case of origin
		switch(this.adapter.config.origin){
			case this.adapter.origin.ttn:
				await this.handleTtnMessage(topic,message);
				break;
			case this.adapter.origin.chirpstack:
				await this.handleChirpstackMessage(topic,message);
		}
	}

	// Startup
	async generateDownlinksAndRemoveStatesAtStatup(){
		const activeFunction = "generateDownlinkstatesAtStatup";
		try{
			const adapterObjectsAtStart = await this.adapter.getAdapterObjectsAsync();
			for(const adapterObject of Object.values(adapterObjectsAtStart)){
				if(adapterObject.type === "device"){
					await this.fillWithDownlinkConfig(adapterObject._id);
					//await this.addDirectoriesToPresentDirectory(`${stateId}`); Not used yet (Maybe for thefuture with more folders)
				}
			}

			// remove not configed states
			for(const adapterObject of Object.values(adapterObjectsAtStart)){
				if(adapterObject.type === "state" && (adapterObject._id.indexOf("downlink.control") !== -1)){
					const changeInfo = await this.adapter.getChangeInfo(adapterObject._id);
					const downlinkParameter = this.adapter.downlinkConfighandler.getDownlinkParameter(changeInfo,{startupCheck:true});
					if(!downlinkParameter || this.stateForbidden(changeInfo.changedState)){
						await this.adapter.delObjectAsync(this.adapter.removeNamespace(adapterObject._id));
						this.adapter.log.debug(`${activeFunction}: the state ${changeInfo.changedState} was deleted out of ${changeInfo.objectStartDirectory}`);
					}
				}
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
		}
	}

	//Add directories at startup (so theyare present before next upload)
	async addDirectoriesToPresentDirectory(startDirectory){
		await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories.application.devices.deviceEUI.deviceId.downlink.nextSend,`${startDirectory}.${this.directoryhandler.reachableSubfolders.downlinkNextSend}`,"","");
		await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories.application.devices.deviceEUI.deviceId.downlink.lastSend,`${startDirectory}.${this.directoryhandler.reachableSubfolders.downlinkLastSend}`,"","");
	}

	async fillWithDownlinkConfig(deviceStartdirectory){
		const activeFunction = "fillWithDownlinkConfig";
		try{
			const changeInfo = await this.adapter.getChangeInfo(`${deviceStartdirectory}.fillDownlinkFolder`);
			const foundLength = {};
			//iterate downlinkDevice
			for(const downlinkDevice in this.adapter.downlinkConfighandler.activeDownlinkConfigs){
				// query for match deviceType
				if((downlinkDevice === "all" || downlinkDevice === this.adapter.downlinkConfighandler.internalDevices.baseDevice || changeInfo.deviceType.indexOf(downlinkDevice) === 0)){
					// iterate downlinkConfig
					for(const downlinkParameter of Object.values(this.adapter.downlinkConfighandler.activeDownlinkConfigs[downlinkDevice].downlinkState)){
						this.adapter.log.silly(`the downlinkparameter ${JSON.stringify(downlinkParameter)}, will be checked.`);
						// check for forbidden states
						if(this.stateForbidden(downlinkParameter.name)){
							continue;
						}
						// Create found length if not defined
						if(!foundLength[downlinkParameter.name]){
							foundLength[downlinkParameter.name] = 0;
						}
						// check found length
						if(downlinkDevice.length > foundLength[downlinkParameter.name]){
							let stateCommonRole = "level";
							let stateCommonType = downlinkParameter.type;
							// Assign role (if present)
							if(this.downlinkRoles[stateCommonType]){
								stateCommonRole = this.downlinkRoles[stateCommonType];
							}
							// Reassign type
							if(stateCommonType === "button"){
								stateCommonType = "boolean";
							}
							else if(stateCommonType === "ascii"){
								stateCommonType = "string";
							}
							// declare def / min / max
							let stateCommonMin = undefined;
							let stateCommonDef = 0; //just numbers
							let stateCommonMax = undefined;
							if(stateCommonType === "number"){
								if(downlinkParameter.limitMin){
									stateCommonMin = downlinkParameter.limitMinValue;
									if(stateCommonMin > stateCommonDef){
										stateCommonDef = stateCommonMin;
									}
								}
								else if(stateCommonType === "number"){
									stateCommonMin = -1000000;
								}
								if(downlinkParameter.limitMax){
									stateCommonMax = downlinkParameter.limitMaxValue;
									if(stateCommonMax > stateCommonDef){
										stateCommonDef = stateCommonMax;
									}
								}
								else if(stateCommonType === "number"){
									stateCommonMax = 1000000;
								}
							}
							await this.adapter.extendObjectAsync(`${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkControl}.${downlinkParameter.name}`,{
								type: "state",
								common: {
									name: "",
									type: stateCommonType,
									role: stateCommonRole,
									read: stateCommonRole !== "button",
									write: true,
									unit: downlinkParameter.unit? downlinkParameter.unit:"",
									min: stateCommonMin,
									max: stateCommonMax,
									def: stateCommonType === "boolean"? false : stateCommonType === "number"? stateCommonDef: "",
								},
								native: {},
							});
							if(downlinkDevice !=="all" && downlinkDevice !== this.adapter.downlinkConfighandler.internalDevices.baseDevice){
								foundLength[downlinkParameter.name] = downlinkDevice.length;
							}
						}
					}
				}
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
		}
	}

	stateForbidden(stateName){
		switch(this.adapter.config.origin){
			case this.adapter.origin.ttn:
				return false;
			case this.adapter.origin.chirpstack:
				return stateName === "replace";
		}
	}
	/*****************************************************************************************************************
	 * ***************************************************************************************************************
	 * **************************************************************************************************************/

	/*********************************************************************
	 * ***************************** TTN  ********************************
	 * ******************************************************************/


	/*********************************************************************
	 * **************************** Message ******************************
	 * ******************************************************************/

	async handleTtnMessage(topic,message){
		const activeFunction = "handleTtnMessage";

		try{
			const messageType = topic.substring(topic.lastIndexOf("/") + 1 ,topic.length);
			this.adapter.log.silly(`the messagetype ${messageType} was determined`);
			// generate startdirectory of device
			const deviceStartdirectory = this.directoryhandler.getDeviceStartDirectory(topic,message);
			this.adapter.log.silly(`the startdirectory ${deviceStartdirectory} was determined`);

			/*********************************************************************
			 * ****************** Check device startdirectory ********************
			 * ******************************************************************/

			if(messageType !== "up" && messageType !== "join" && !await this.adapter.objectExists(`${deviceStartdirectory}`)){
				this.adapter.log.debug(`There was a message with the topic ${topic}, but the object ${deviceStartdirectory} does not exists yet.`);
				return;
			}

			/*********************************************************************
			 * ************************* Infodata ********************************
			 * ******************************************************************/

			/*********************************************************************
			 * ********************** Uplink data ********************************
			 * ******************************************************************/

			// check for uplink message
			if(messageType === "up"){
				/*********************************************************************
			 	* ************************ Main directories *************************
			 	* ******************************************************************/

				await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories,"",topic,message);

				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				this.adapter.log.silly(`write rawdata`);
				let startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRaw}`;
				// write json
				await this.adapter.setObjectNotExistsAsync(`${startId}.json`,{
					type: "state",
					common: {
						name: "last recieved message",
						type: "json",
						role: "value",
						read: true,
						write: false
					},
					native: {},
				});
				await this.adapter.setStateAsync(`${startId}.json`,JSON.stringify(message),true);

				/*********************************************************************
				* ********************** Rawdata (Base64) ***************************
				* ******************************************************************/
				// check for frm payload
				if(message.uplink_message.frm_payload){
					// wite base64 data
					this.adapter.log.silly(`write base64`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.base64`,{
						type: "state",
						common: {
							name: "last recieved data as base64",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const writedata = message.uplink_message.frm_payload;
					await this.adapter.setStateAsync(`${startId}.base64`,writedata,true);

					// write base64 data in hex data
					this.adapter.log.silly(`write hex`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.hex`,{
						type: "state",
						common: {
							name: "last recieved data as hex",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const hexdata = Buffer.from(message.uplink_message.frm_payload, "base64").toString("hex").toUpperCase();
					await this.adapter.setStateAsync(`${startId}.hex`,hexdata,true);

					// write base64 data in string data
					this.adapter.log.silly(`write string`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.string`,{
						type: "state",
						common: {
							name: "last recieved data as string",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const stringdata = Buffer.from(message.uplink_message.frm_payload, "base64").toString();
					await this.adapter.setStateAsync(`${startId}.string`,stringdata,true);
				}

				/*********************************************************************
				 * ********************** decoded payload ****************************
				 * ******************************************************************/

				startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkDecoded}`;
				this.adapter.log.silly(`write decoded payload`);
				await this.directoryhandler.generateRekursivObjects(message.uplink_message.decoded_payload,startId,topic,message);

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRemaining}`;
				this.adapter.log.silly(`write remaining uplink data`);

				await this.directoryhandler.generateRekursivObjects(message.uplink_message,startId,topic,message,{ignoredElementNames:{decoded_payload:{},frm_payload:{}}});

				/*********************************************************************
			 	* ******************* Check downlink at uplink **********************
				* ******************************************************************/

				await this.adapter.checkSendDownlinkWithUplink(`${deviceStartdirectory}.downlink.control.push`);
			}

			/*********************************************************************
			 * ************************* Downlink data ***************************
			 * ******************************************************************/

			// check for uplink message
			else if(messageType === "queued" || messageType === "sent"){
				// Check wich downlink was recieved
				const downlinkType = `downlink_${messageType}`;
				/*********************************************************************
				* ************************ Rawdata json *****************************
				* ******************************************************************/

				let startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkRaw}`;
				// write json
				this.adapter.log.silly(`write rawdata`);
				await this.adapter.setObjectNotExistsAsync(`${startId}.json`,{
					type: "state",
					common: {
						name: "last recieved message",
						type: "json",
						role: "value",
						read: true,
						write: false
					},
					native: {},
				});
				await this.adapter.setStateAsync(`${startId}.json`,JSON.stringify(message),true);

				/*********************************************************************
				* ********************** Rawdata (Base64) ***************************
				* ******************************************************************/

				// check for frm payload
				this.adapter.log.silly(`write base64`);
				if(message[downlinkType].frm_payload){
					// wite base64 data
					await this.adapter.setObjectNotExistsAsync(`${startId}.base64`,{
						type: "state",
						common: {
							name: "last recieved data as base64",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const writedata = message[downlinkType].frm_payload;
					await this.adapter.setStateAsync(`${startId}.base64`,writedata,true);

					// write base64 data in hex data
					this.adapter.log.silly(`write hex`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.hex`,{
						type: "state",
						common: {
							name: "last recieved data as hex",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const hexdata = Buffer.from(message[downlinkType].frm_payload,"base64").toString("hex").toUpperCase();
					await this.adapter.setStateAsync(`${startId}.hex`,hexdata,true);

					// write base64 data in string data
					this.adapter.log.silly(`write string`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.string`,{
						type: "state",
						common: {
							name: "last recieved data as string",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const stringdata = Buffer.from(message[downlinkType].frm_payload,"base64").toString();
					await this.adapter.setStateAsync(`${startId}.string`,stringdata,true);
				}

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkRemaining}`;
				this.adapter.log.silly(`write remaining downlink data`);
				await this.directoryhandler.generateRekursivObjects(message[downlinkType],startId,topic,message,{ignoredElementNames:{frm_payload:{}}});
			}

			// check for join message
			else if(messageType === "join"){

				/*********************************************************************
			 	* ************************ Main directories *************************
			 	* ******************************************************************/

				await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories,"",topic,message);

				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				this.adapter.log.silly(`write rawdata`);
				const startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.joinRaw}`;
				// write json
				await this.adapter.setObjectNotExistsAsync(`${startId}.json`,{
					type: "state",
					common: {
						name: "last recieved message",
						type: "json",
						role: "value",
						read: true,
						write: false
					},
					native: {},
				});
				await this.adapter.setStateAsync(`${startId}.json`,JSON.stringify(message),true);
				const changeInfo = await this.adapter.getChangeInfo(startId);
				this.adapter.log.info(`the device ${changeInfo.deviceEUI} joined network`);
			}
			// Other messagetypes
			else{
				this.adapter.log.debug(`the messagetype: ${messageType}, is not implemented yet`);
			}

			/*********************************************************************
			 * ********************** downlinkConfigs ****************************
			 * ******************************************************************/
			this.adapter.log.silly(`check configed downlinks`);
			await this.fillWithDownlinkConfig(deviceStartdirectory);
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
		}
	}





	/*********************************************************************
	 * ************************** Chirpstack  ****************************
	 * ******************************************************************/


	/*********************************************************************
	 * **************************** Message ******************************
	 * ******************************************************************/

	async handleChirpstackMessage(topic,message){
		const activeFunction = "handleChirpstackMessage";

		try{
			const messageType = topic.substring(topic.lastIndexOf("/") + 1 ,topic.length);
			this.adapter.log.silly(`the messagetype ${messageType} was determined`);
			// generate startdirectory of device
			const deviceStartdirectory = this.directoryhandler.getDeviceStartDirectory(topic,message);
			this.adapter.log.silly(`the startdirectory ${deviceStartdirectory} was determined`);

			/*********************************************************************
			 * ****************** Check device startdirectory ********************
			 * ******************************************************************/

			if(messageType !== "up" && messageType !== "join" && !await this.adapter.objectExists(`${deviceStartdirectory}`)){
				this.adapter.log.debug(`There was a message with the topic ${topic}, but the object ${deviceStartdirectory} does not exists yet.`);
				return;
			}

			/*********************************************************************
			 * ************************* Infodata ********************************
			 * ******************************************************************/

			/*********************************************************************
			 * ********************** Uplink data ********************************
			 * ******************************************************************/

			// check for uplink message
			if(messageType === "up"){

				/*********************************************************************
			 	* ************************ Main directories *************************
			 	* ******************************************************************/

				await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories,"",topic,message);

				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				let startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRaw}`;
				// write json
				this.adapter.log.silly(`write rawdata`);
				await this.adapter.setObjectNotExistsAsync(`${startId}.json`,{
					type: "state",
					common: {
						name: "last recieved message",
						type: "json",
						role: "value",
						read: true,
						write: false
					},
					native: {},
				});
				await this.adapter.setStateAsync(`${startId}.json`,JSON.stringify(message),true);

				/*********************************************************************
				* ********************** Rawdata (Base64) ***************************
				* ******************************************************************/
				// check for data
				if(message.data){
					// wite base64 data
					this.adapter.log.silly(`write base64`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.base64`,{
						type: "state",
						common: {
							name: "last recieved data as base64",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const writedata = message.data;
					await this.adapter.setStateAsync(`${startId}.base64`,writedata,true);

					// write base64 data in hex data
					this.adapter.log.silly(`write hex`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.hex`,{
						type: "state",
						common: {
							name: "last recieved data as hex",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const hexdata = Buffer.from(message.data, "base64").toString("hex").toUpperCase();
					await this.adapter.setStateAsync(`${startId}.hex`,hexdata,true);

					// write base64 data in string data
					this.adapter.log.silly(`write string`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.string`,{
						type: "state",
						common: {
							name: "last recieved data as string",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const stringdata = Buffer.from(message.data, "base64").toString();
					await this.adapter.setStateAsync(`${startId}.string`,stringdata,true);
				}

				/*********************************************************************
				 * ****************** decoded payload (Object) ***********************
				 * ******************************************************************/
				startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkDecoded}`;
				this.adapter.log.silly(`write decoded payload (Object)`);
				await this.directoryhandler.generateRekursivObjects(message.object,startId,topic,message);

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRemaining}`;
				this.adapter.log.silly(`write remaining uplink data`);
				await this.directoryhandler.generateRekursivObjects(message,startId,topic,message,{ignoredElementNames:{deduplicationId:{},deviceInfo:{},data:{},object:{}}});

				/*********************************************************************
			 	* ******************* Check downlink at uplink **********************
				* ******************************************************************/

				await this.adapter.checkSendDownlinkWithUplink(`${deviceStartdirectory}.downlink.control.push`);
			}

			/*********************************************************************
			 * ************************* Downlink data ***************************
			 * ******************************************************************/

			// check for uplink message
			else if(messageType === "down"){

				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				const startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkRaw}`;
				// write json
				this.adapter.log.silly(`write rawdata`);
				await this.adapter.setObjectNotExistsAsync(`${startId}.json`,{
					type: "state",
					common: {
						name: "last recieved message",
						type: "json",
						role: "value",
						read: true,
						write: false
					},
					native: {},
				});
				await this.adapter.setStateAsync(`${startId}.json`,JSON.stringify(message),true);

				/*********************************************************************
				* ********************** Rawdata (Base64) ***************************
				* ******************************************************************/

				// check for data
				if(message.data){
					// wite base64 data
					this.adapter.log.silly(`write base64`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.base64`,{
						type: "state",
						common: {
							name: "last recieved data as base64",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const writedata = message.data;
					await this.adapter.setStateAsync(`${startId}.base64`,writedata,true);

					// write base64 data in hex data
					this.adapter.log.silly(`write hex`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.hex`,{
						type: "state",
						common: {
							name: "last recieved data as hex",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const hexdata = Buffer.from(message.data,"base64").toString("hex").toUpperCase();
					await this.adapter.setStateAsync(`${startId}.hex`,hexdata,true);

					// write base64 data in string data
					this.adapter.log.silly(`write string`);
					await this.adapter.setObjectNotExistsAsync(`${startId}.string`,{
						type: "state",
						common: {
							name: "last recieved data as string",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const stringdata = Buffer.from(message.data,"base64").toString();
					await this.adapter.setStateAsync(`${startId}.string`,stringdata,true);
				}

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

			}

			// check for uplink message
			else if(messageType === "join"){
				/*********************************************************************
			 	* ************************ Main directories *************************
			 	* ******************************************************************/

				await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories,"",topic,message);

				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				const startId = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.joinRaw}`;
				// write json
				this.adapter.log.silly(`write rawdata`);
				await this.adapter.setObjectNotExistsAsync(`${startId}.json`,{
					type: "state",
					common: {
						name: "last recieved message",
						type: "json",
						role: "value",
						read: true,
						write: false
					},
					native: {},
				});
				await this.adapter.setStateAsync(`${startId}.json`,JSON.stringify(message),true);
				const changeInfo = await this.adapter.getChangeInfo(startId);
				this.adapter.log.info(`the device ${changeInfo.deviceEUI} joined network`);
			}
			// Other messagetypes
			else{
				this.adapter.log.debug(`the messagetype: ${messageType}, is not implemented yet`);
			}

			/*********************************************************************
			 * ********************** downlinkConfigs ****************************
			 * ******************************************************************/
			this.adapter.log.silly(`check configed downlinks`);
			await this.fillWithDownlinkConfig(deviceStartdirectory);

		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error} - - - Message: ${JSON.stringify(message)}`);
		}
	}

	/*********************************************************************
	 * *******************************************************************
	 * ******************************************************************/
}

module.exports = messagehandlerClass;