const directorieshandlerClass = require("./directorieshandler");

class messagehandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		this.directoryhandler = new directorieshandlerClass(this.adapter);
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
				if(adapterObject.type === "channel" && adapterObject.common.name !== "Information"){
					await this.fillWithDownlinkConfig(adapterObject._id);
					//await this.addDirectoriesToPresentDirectory(`${stateId}`); Not used yet (Maybe for thefuture with more folders)
				}
			}

			// remove not configed states
			for(const adapterObject of Object.values(adapterObjectsAtStart)){
				if(adapterObject.type === "state" && (adapterObject._id.indexOf("downlink.control") !== -1)){
					const changeInfo = await this.adapter.getChangeInfo(adapterObject._id);
					const downlinkConfig = this.adapter.downlinkConfighandler.getDownlinkConfig(changeInfo,{startupCheck:true});
					
					if(changeInfo.changedState === "replace"){
						this.adapter.log.warn("replace gefunden");
					}
					if(!downlinkConfig || this.stateForbidden(changeInfo.changedState)){
						await this.adapter.delObjectAsync(this.adapter.removeNamespace(adapterObject._id));
						this.adapter.log.warn("replace gelöscht");
					}
					else{
						this.adapter.log.warn("aber nicht gelöscht");
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
		await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories.application.devices.deviceUid.deviceId.downlink.nextSend,`${startDirectory}.${this.directoryhandler.reachableSubfolders.downlinkNextSend}`,"","");
		await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories.application.devices.deviceUid.deviceId.downlink.lastSend,`${startDirectory}.${this.directoryhandler.reachableSubfolders.downlinkLastSend}`,"","");
	}

	async fillWithDownlinkConfig(deviceStartdirectory){
		const activeFunction = "fillWithDownlinkConfig";
		try{
			const changeInfo = await this.adapter.getChangeInfo(`${deviceStartdirectory}.fillDownlinkFolder`);
			const foundLength = {};
			//iterate downlinkDevice
			for(const downlinkDevice in this.adapter.downlinkConfighandler.activeDownlinkConfigs){
				// query for match deviceType
				if((downlinkDevice === "all" || changeInfo.deviceType.indexOf(downlinkDevice) === 0)){
					// iterate downlinkConfig
					for(const downlinkConfig of Object.values(this.adapter.downlinkConfighandler.activeDownlinkConfigs[downlinkDevice].downlinkState)){
						this.adapter.log.silly(`the downlinkconfig ${JSON.stringify(downlinkConfig)}, will checked.`);
						// check for forbidden states
						if(this.stateForbidden(changeInfo.changedState)){
							continue;
						}
						// Create found length if not defined
						if(!foundLength[downlinkConfig.name]){
							foundLength[downlinkConfig.name] = 0;
						}
						// check found length
						if(downlinkDevice.length > foundLength[downlinkConfig.name]){
							let commonStateRole = "value";
							let commonStateType = downlinkConfig.type;
							if(commonStateType === "button"){
								commonStateType = "boolean";
								commonStateRole = "button";
							}
							else if(commonStateType === "ascii"){
								commonStateType = "string";
							}
							await this.adapter.setObjectAsync(`${deviceStartdirectory}.downlink.control.${downlinkConfig.name}`,{
								type: "state",
								common: {
									name: "",
									type: commonStateType,
									role: commonStateRole,
									read: true,
									write: true,
									unit: downlinkConfig.unit? downlinkConfig.unit:"",
									def: commonStateType === "boolean"? false : commonStateType === "number"? 0: "",
								},
								native: {},
							});
							if(downlinkDevice !=="all"){
								foundLength[downlinkConfig.name] = downlinkDevice.length;
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
			const deviceStartdirectory = await this.directoryhandler.getObjectDirectory(topic,message,this.directoryhandler.searchableAttributeNames.deviceId);
			this.adapter.log.silly(`the startdirectory ${deviceStartdirectory} was determined`);
			/*********************************************************************
			 * ************************ Main directories *************************
			 * ******************************************************************/

			await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories,"",topic,message);

			/*********************************************************************
			 * ************************* Infodata ********************************
			 * ******************************************************************/

			/*********************************************************************
			 * ********************** Uplink data ********************************
			 * ******************************************************************/

			// check for uplink message
			if(messageType === "up"){//if(message.uplink_message){
				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				this.adapter.log.silly(`write rawdata`);
				let startDirectory = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRaw}`;
				// write json
				await this.adapter.setObjectNotExistsAsync(`${startDirectory}.json`,{
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
				await this.adapter.setStateAsync(`${startDirectory}.json`,JSON.stringify(message),true);

				/*********************************************************************
				* ********************** Rawdata (Base64) ***************************
				* ******************************************************************/
				// check for frm payload
				if(message.uplink_message.frm_payload){
					// wite base64 data
					this.adapter.log.silly(`write base64`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.base64`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.base64`,writedata,true);

					// write base64 data in hex data
					this.adapter.log.silly(`write hex`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.hex`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.hex`,hexdata,true);

					// write base64 data in string data
					this.adapter.log.silly(`write string`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.string`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.string`,stringdata,true);
				}

				/*********************************************************************
				 * ********************** decoded payload ****************************
				 * ******************************************************************/

				startDirectory = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkDecoded}`;
				this.adapter.log.silly(`write decoded payload`);
				await this.directoryhandler.generateRekursivObjects(message.uplink_message.decoded_payload,startDirectory,topic,message);

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				startDirectory = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRemaining}`;
				this.adapter.log.silly(`write remaining uplink data`);

				await this.directoryhandler.generateRekursivObjects(message.uplink_message,startDirectory,topic,message,{ignoredElementNames:{decoded_payload:{},frm_payload:{}}});

				/*********************************************************************
			 	* ******************* Check downlink at uplink **********************
				* ******************************************************************/

				await this.adapter.checkSendDownlinkWithUplink(`${deviceStartdirectory}.downlink.control.push`);
			}

			/*********************************************************************
			 * ************************* Downlink data ***************************
			 * ******************************************************************/

			// check for uplink message
			else if(messageType === "queued" || messageType === "sent"){ //if(message.downlink_queued || message.downlink_sent)//if(message.downlink_queued || message.downlink_sent){
				// Check wich downlink was recieved
				const downlinkType = `downlink_${messageType}`;
				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				let startDirectory = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkRaw}`;
				// write json
				this.adapter.log.silly(`write rawdata`);
				await this.adapter.setObjectNotExistsAsync(`${startDirectory}.json`,{
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
				await this.adapter.setStateAsync(`${startDirectory}.json`,JSON.stringify(message),true);

				/*********************************************************************
				* ********************** Rawdata (Base64) ***************************
				* ******************************************************************/

				// check for frm payload
				this.adapter.log.silly(`write base64`);
				if(message[downlinkType].frm_payload){
					// wite base64 data
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.base64`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.base64`,writedata,true);

					// write base64 data in hex data
					this.adapter.log.silly(`write hex`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.hex`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.hex`,hexdata,true);

					// write base64 data in string data
					this.adapter.log.silly(`write string`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.string`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.string`,stringdata,true);
				}

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				startDirectory = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkRemaining}`;
				this.adapter.log.silly(`write remaining downlink data`);
				await this.directoryhandler.generateRekursivObjects(message[downlinkType],startDirectory,topic,message,{ignoredElementNames:{frm_payload:{}}});
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
			const deviceStartdirectory = await this.directoryhandler.getObjectDirectory(topic,message,this.directoryhandler.searchableAttributeNames.deviceId);
			this.adapter.log.silly(`the startdirectory ${deviceStartdirectory} was determined`);

			/*********************************************************************
			 * ************************ Main directories *************************
			 * ******************************************************************/

			await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories,"",topic,message);

			/*********************************************************************
			 * ************************* Infodata ********************************
			 * ******************************************************************/

			/*********************************************************************
			 * ********************** Uplink data ********************************
			 * ******************************************************************/

			// check for uplink message
			if(messageType === "up"){//if(message.uplink_message){

				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				let startDirectory = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRaw}`;
				// write json
				this.adapter.log.silly(`write rawdata`);
				await this.adapter.setObjectNotExistsAsync(`${startDirectory}.json`,{
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
				await this.adapter.setStateAsync(`${startDirectory}.json`,JSON.stringify(message),true);

				/*********************************************************************
				* ********************** Rawdata (Base64) ***************************
				* ******************************************************************/
				// check for data
				if(message.data){
					// wite base64 data
					this.adapter.log.silly(`write base64`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.base64`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.base64`,writedata,true);

					// write base64 data in hex data
					this.adapter.log.silly(`write hex`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.hex`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.hex`,hexdata,true);

					// write base64 data in string data
					this.adapter.log.silly(`write string`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.string`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.string`,stringdata,true);
				}

				/*********************************************************************
				 * ****************** decoded payload (Object) ***********************
				 * ******************************************************************/
				startDirectory = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkDecoded}`;
				this.adapter.log.silly(`write decoded payload (Object)`);
				await this.directoryhandler.generateRekursivObjects(message.object,startDirectory,topic,message);

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				startDirectory = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.uplinkRemaining}`;
				this.adapter.log.silly(`write remaining uplink data`);
				await this.directoryhandler.generateRekursivObjects(message,startDirectory,topic,message,{ignoredElementNames:{deduplicationId:{},deviceInfo:{},data:{},object:{}}});

				/*********************************************************************
			 	* ******************* Check downlink at uplink **********************
				* ******************************************************************/

				await this.adapter.checkSendDownlinkWithUplink(`${deviceStartdirectory}.downlink.control.push`);
			}

			/*********************************************************************
			 * ************************* Downlink data ***************************
			 * ******************************************************************/

			// check for uplink message
			else if(messageType === "down"){ //if(message.downlink_queued || message.downlink_sent)//if(message.downlink_queued || message.downlink_sent){

				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				const startDirectory = `${deviceStartdirectory}.${this.directoryhandler.reachableSubfolders.downlinkRaw}`;
				// write json
				this.adapter.log.silly(`write rawdata`);
				await this.adapter.setObjectNotExistsAsync(`${startDirectory}.json`,{
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
				await this.adapter.setStateAsync(`${startDirectory}.json`,JSON.stringify(message),true);

				/*********************************************************************
				* ********************** Rawdata (Base64) ***************************
				* ******************************************************************/

				// check for data
				if(message.data){
					// wite base64 data
					this.adapter.log.silly(`write base64`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.base64`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.base64`,writedata,true);

					// write base64 data in hex data
					this.adapter.log.silly(`write hex`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.hex`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.hex`,hexdata,true);

					// write base64 data in string data
					this.adapter.log.silly(`write string`);
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.string`,{
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
					await this.adapter.setStateAsync(`${startDirectory}.string`,stringdata,true);
				}

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

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