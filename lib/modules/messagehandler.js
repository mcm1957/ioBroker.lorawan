const directorieshandlerClass = require("./directorieshandler");

class messagehandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		this.directoryhandler = new directorieshandlerClass(this.adapter);
	}

	getDownlink(downlinkConfig,state){
		// Select datahandling in case of origin
		if(this.adapter.config.ttn){
			return this.getTtnDownlink(downlinkConfig,state);
		}
		else if(this.adapter.config.chirpstack){
			//	 this.handleChirpstack(topic,message);
		}
	}

	getTtnDownlink(downlinkConfig,state){
		// declare pyaload variable
		let payloadInHex = "";
		let multipliedVal = 0;
		//Check type
		if(downlinkConfig.type === "boolean"){
			if(state.val){
				payloadInHex = downlinkConfig.on;
			}
			else{
				payloadInHex = downlinkConfig.off;
			}
		}
		else{
			switch(downlinkConfig.type){
				case "number":
					multipliedVal = state.val * downlinkConfig.multiplyfaktor;
					payloadInHex = multipliedVal.toString(16).toUpperCase();
					break;

				case "ascii":
				case "string":
					payloadInHex = Buffer.from(state.val).toString("hex");
					break;
			}
			const numberOfDiggits = downlinkConfig.length - downlinkConfig.front.length + downlinkConfig.end.length;
			let zeroDiggits = "";

			for(let index = 1; index <= numberOfDiggits; index++){
				zeroDiggits += "0";
			}
			payloadInHex = (zeroDiggits + payloadInHex).slice(-numberOfDiggits);
			payloadInHex = downlinkConfig.front + payloadInHex + downlinkConfig.end;
		}

		//convert hex in base64
		const payloadInBase64 = Buffer.from(payloadInHex, "hex").toString("base64");

		// retun the whole downlink
		return 	{downlinks:[{f_port:downlinkConfig.port,frm_payload:payloadInBase64,priority:downlinkConfig.priority,confirmed:downlinkConfig.confirmed}]};
	}

	async handleMessage(topic,message){
		// Select datahandling in case of origin
		if(this.adapter.config.ttn){
			await this.handleTtnMessage(topic,message);
		}
		else if(this.adapter.config.chirpstack){
			//	await this.handleChirpstackMessage(topic,message);
		}
	}

	async handleTtnMessage(topic,message){
		/*if(message.uplink_message){
			if(message.end_device_ids.dev_eui === "A84041162183F8FB"){
				this.adapter.log.debug("UPLINK");
				this.adapter.log.debug(JSON.stringify(message.uplink_message.decoded_payload));
			}
		}
		else{
			this.adapter.log.debug("Downlink");
			if(message.downlink_sent){
				this.adapter.log.debug("Gesendet");
			}
			else{
				this.adapter.log.debug("Quittiert");
			}
		}*/
		// generate startdorectory of device
		const deviceStartdirectory = this.directoryhandler.getTtnObjectDirectory(message,this.directoryhandler.searchableAttributeNames.deviceId);
		/*********************************************************************
		 * ************************ Main directories *************************
		 * ******************************************************************/
		/*	if(message.end_device_ids.device_id !== "eui-lobaro-modbus"){
			return;
		}*/
		try{
			await this.directoryhandler.generateRekursivObjects(this.directoryhandler.directories,"",message);
			/*********************************************************************
			 * ************************* Infodata ********************************
			 * ******************************************************************/
			/*
			if(message[this.ttn.dataEntries.uplink_message]){
				if(message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.f_port] === this.ttn.writeableData.firmware.port){
					const stringdata = Buffer.from(message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.frm_payload], "base64").toString();
					await this.adapter.setStateAsync(`${stateId}.${this.ttn.writeableData.firmware.name}`,stringdata,true);
				}
			}
			else if(message[this.ttn.dataEntries.downlink_queued]){
				if(message[this.ttn.dataEntries.downlink_queued][this.ttn.dataEntries.f_port] === this.ttn.writeableData.firmware.port){
					await this.adapter.setStateAsync(`${stateId}.${this.ttn.writeableData.firmware.name}`,this.ttn.writeableData.firmware.downlink_queued,true);
				}
			}
			else if(message[this.ttn.dataEntries.downlink_sent]){
				if(message[this.ttn.dataEntries.downlink_sent][this.ttn.dataEntries.f_port] === this.ttn.writeableData.firmware.port){
					await this.adapter.setStateAsync(`${stateId}.${this.ttn.writeableData.firmware.name}`,this.ttn.writeableData.firmware.downlink_sent,true);
				}
			}
			*/
			/*********************************************************************
			 * ********************** Uplink data ********************************
			 * ******************************************************************/

			// check for uplink message
			if(message.uplink_message){

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
						const hexdata = Buffer.from(message.uplink_message.frm_payload, "base64").toString("hex");
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
					await this.directoryhandler.generateRekursivObjects(message.uplink_message.decoded_payload,startDirectory,message);
				}

				/*********************************************************************
				 * ************************* remaining *******************************
				 * ******************************************************************/

				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkRemaining]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.uplinkRemaining];
					// @ts-ignore
					await this.directoryhandler.generateRekursivObjects(message.uplink_message,startDirectory,message,{ignoredElementNames:{decoded_payload:{},frm_payload:{}}});
				}
			}

			/*********************************************************************
			 * ************************* Downlink data ***************************
			 * ******************************************************************/

			// check for uplink message
			if(message.downlink_queued || message.downlink_sent){
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
						const hexdata = Buffer.from(message[downlinkType].frm_payload,"base64").toString("hex");
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
					await this.directoryhandler.generateRekursivObjects(message[downlinkType],startDirectory,message,{ignoredElementNames:{frm_payload:{}}});
				}
			}

			/*********************************************************************
			 * ************************* downlinks *******************************
			 * ******************************************************************/
/*			// general downling => push and replace (json out of data)
			for(const downlink of Object.values(this.adapter.downlinkConfig.internalDownlinks)){
				if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkControl]){
					const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkControl];

					await this.adapter.setObjectNotExistsAsync(`${startDirectory}.${downlink.name}`,{
						type: "state",
						common: {
							name: "",
							type: "json",
							role: "value",
							read: true,
							write: true
						},
						native: {},
					});
				}
			}
*/

			// configed and internal downlinks
			this.adapter.log.info("CONFIG: " + JSON.stringify(this.adapter.downlinkConfig.activeDownlinkConfigs));
			for(const downlinkDevices of Object.values(this.adapter.downlinkConfig.activeDownlinkConfigs)){
				for(const downlinkConfig of Object.values(downlinkDevices)){
					if(this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkControl]){
						const startDirectory = this.directoryhandler.reachableDirectories[deviceStartdirectory][this.directoryhandler.safeableDirectories.downlinkControl];
						const changeInfo = await this.adapter.getChangeInfo(`${startDirectory}.${downlinkConfig.name}`);
						if(downlinkConfig.deviceType === "all" || downlinkConfig.deviceType === changeInfo.deviceType){
							let CommonStateType = downlinkConfig.type;
							if(CommonStateType === "ascii"){
								CommonStateType = "string";
							}
							await this.adapter.setObjectNotExistsAsync(`${startDirectory}.${downlinkConfig.name}`,{
								type: "state",
								common: {
									name: "",
									type: CommonStateType,
									role: "value",
									read: true,
									write: true,
									unit: downlinkConfig.unit? downlinkConfig.unit:"",
									def: CommonStateType === "boolean"? false : CommonStateType === "number"? 0: "",
								},
								native: {},
							});
						}
					}
				}
			}
		}
		catch(error){
			this.adapter.log.warn("check: " + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}


	/*********************************************************************
	 * *********************** Downlinktopic *****************************
	 * ******************************************************************/

	getDownlinkTopic(id,suffix){
		// Select datahandling in case of origin
		if(this.adapter.config.ttn){
			return this.getTtnDownlinkTopicFromDirektory(id,suffix);
		}
		else if(this.adapter.config.chirpstack){
			//	 this.handleChirpstack(topic,message);
		}
	}

	getTtnDownlinkTopicFromDirektory(changeInfo,suffix){
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

	/*****************************************************************************************************************
	 * ***************************************************************************************************************
	 * **************************************************************************************************************/

}

module.exports = messagehandlerClass;