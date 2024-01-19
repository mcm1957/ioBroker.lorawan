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
		if(this.adapter.config.origin === "ttn"){
			await this.handleTtnMessage(topic,message);
		}
		else if(this.adapter.config.origin === "chirpstack"){
			await this.handleChirpstackMessage(topic,message);
		}
	}

	// Startup
	async generateDownlinkstatesAtStatup(){
		const adapterObjectsAtStart = await this.adapter.getAdapterObjectsAsync();
		for(const adapterObject of Object.values(adapterObjectsAtStart)){
			if(adapterObject.type === "channel" && adapterObject.common.name !== "Information"){
				const stateId = this.adapter.removeNamespace(adapterObject._id);
				await this.fillWithDownlinkConfig(stateId);
			}
		}

		// remove not configed states
		for(const adapterObject of Object.values(adapterObjectsAtStart)){
			if(adapterObject.type === "state" && (adapterObject._id.indexOf("downlink.control") !== -1 || adapterObject._id.indexOf("downlink.configuration") !== -1)){
				const changeInfo = await this.adapter.getChangeInfo(adapterObject._id);
				const downlinkConfig = this.adapter.downlinkConfighandler.getDownlinkConfig(changeInfo,{startupCheck:true});
				if(!downlinkConfig){
					this.adapter.delObjectAsync(this.adapter.removeNamespace(adapterObject._id));
				}
			}
		}
	}

	async fillWithDownlinkConfig(deviceStartdirectory){
		for(const downlinkDevices of Object.values(this.adapter.downlinkConfighandler.activeDownlinkConfigs)){
			for(const downlinkConfig of Object.values(downlinkDevices)){
				let startDirectory = "";
				if(!downlinkConfig.isConfiguration){
					startDirectory = `${deviceStartdirectory}.downlink.control`;
				}
				else{
					startDirectory = `${deviceStartdirectory}.downlink.configuration`;
				}
				const changeInfo = await this.adapter.getChangeInfo(`${startDirectory}.${downlinkConfig.name}`);
				if(downlinkConfig.deviceType === "all" || downlinkConfig.deviceType === changeInfo.deviceType || changeInfo.deviceType.indexOf(downlinkConfig.deviceType) === 0){
					let commonStateRole = "value";
					let commonStateType = downlinkConfig.type;
					if(commonStateType === "button"){
						commonStateType = "boolean";
						commonStateRole = "button";
					}
					else if(commonStateType === "ascii"){
						commonStateType = "string";
					}
					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.${downlinkConfig.name}`,{
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
				}
			}
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
			this.adapter.log.debug(`the messagetype ${messageType} was determined`);
			// generate startdirectory of device
			const deviceStartdirectory = this.directoryhandler.getObjectDirectory(topic,message,this.directoryhandler.searchableAttributeNames.deviceId);
			this.adapter.log.debug(`the startdirectory ${deviceStartdirectory} was determined`);

			/*********************************************************************
			 * ************************ Main directories *************************
			 * ******************************************************************/

			/*********************************************************************
			 * ************************* Infodata ********************************
			 * ******************************************************************/

			/*********************************************************************
			 * ********************** Uplink data ********************************
			 * ******************************************************************/

			// check for uplink message
			if(messageType === "up"){//if(message.uplink_message){

				// Generate new directories only with uplink

				await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories,"",topic,message);

				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkRaw]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkRaw];
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
				}

				/*********************************************************************
				 * ********************** decoded payload ****************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkDecoded]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkDecoded];
					await this.directoryhandler.generateRekursivObjects(message.uplink_message.decoded_payload,startDirectory,topic,message);
				}

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkRemaining]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkRemaining];
					// @ts-ignore
					await this.directoryhandler.generateRekursivObjects(message.uplink_message,startDirectory,topic,message,{ignoredElementNames:{decoded_payload:{},frm_payload:{}}});
				}
			}

			/*********************************************************************
			 * ************************* Downlink data ***************************
			 * ******************************************************************/

			// check for uplink message
			else if(messageType === "queued" || messageType === "sent"){ //if(message.downlink_queued || message.downlink_sent)//if(message.downlink_queued || message.downlink_sent){
				// Check wich downlink was recieved
				let downlinkType = "downlink_queued";
				if(message.downlink_sent){
					downlinkType = "downlink_sent";
				}
				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkRaw]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkRaw];
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
				}

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkRemaining]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkRemaining];
					// @ts-ignore
					await this.directoryhandler.generateRekursivObjects(message[downlinkType],startDirectory,topic,message,{ignoredElementNames:{frm_payload:{}}});
				}
			}

			/*********************************************************************
			 * ********************** downlinkConfigs ****************************
			 * ******************************************************************/

			await this.fillWithDownlinkConfig(deviceStartdirectory);
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
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

			// generate startdirectory of device
			const deviceStartdirectory = this.directoryhandler.getObjectDirectory(topic,message,this.directoryhandler.searchableAttributeNames.deviceId);
			/*********************************************************************
			 * ************************ Main directories *************************
			 * ******************************************************************/

			/*********************************************************************
			 * ************************* Infodata ********************************
			 * ******************************************************************/

			/*********************************************************************
			 * ********************** Uplink data ********************************
			 * ******************************************************************/

			// check for uplink message
			if(messageType === "up"){//if(message.uplink_message){

				// generate new directories only with uplink
				await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories,"",topic,message);

				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkRaw]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkRaw];
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

					// check for data
					if(message.data){
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
						const writedata = message.data;
						await this.adapter.setStateAsync(`${startDirectory}.base64`,writedata,true);

						// write base64 data in hex data
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
				}

				/*********************************************************************
				 * ********************** decoded payload ****************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkDecoded]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkDecoded];
					await this.directoryhandler.generateRekursivObjects(message.object,startDirectory,topic,message);
				}

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkRemaining]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkRemaining];
					// @ts-ignore
					await this.directoryhandler.generateRekursivObjects(message,startDirectory,topic,message,{ignoredElementNames:{deduplicationId:{},deviceInfo:{},data:{},object:{}}});
				}
			}

			/*********************************************************************
			 * ************************* Downlink data ***************************
			 * ******************************************************************/

			// check for uplink message
			else if(messageType === "queued" || messageType === "sent"){ //if(message.downlink_queued || message.downlink_sent)//if(message.downlink_queued || message.downlink_sent){
				// Check wich downlink was recieved
				let downlinkType = "downlink_queued";
				if(message.downlink_sent){
					downlinkType = "downlink_sent";
				}
				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkRaw]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkRaw];
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




					// Ab hier muss mal geschautr werden, was kommt




					/*********************************************************************
				 	* ********************** Rawdata (Base64) ***************************
				 	* ******************************************************************/

					// check for frm payload
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
				}

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkRemaining]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkRemaining];
					// @ts-ignore
					await this.directoryhandler.generateRekursivObjects(message[downlinkType],startDirectory,topic,message,{ignoredElementNames:{frm_payload:{}}});
				}
			}

			/*********************************************************************
			 * ********************** downlinkConfigs ****************************
			 * ******************************************************************/

			await this.fillWithDownlinkConfig(deviceStartdirectory);
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}

	/*********************************************************************
	 * *******************************************************************
	 * ******************************************************************/
}

module.exports = messagehandlerClass;