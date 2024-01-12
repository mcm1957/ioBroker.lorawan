
const directorieshandlerClass = require("./directorieshandler");

class messagehandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		this.directoryhandler = new directorieshandlerClass(this.adapter);
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
			dev_uid : `/${changeInfo.dev_uid}`,
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