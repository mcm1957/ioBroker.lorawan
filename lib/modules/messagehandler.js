class messagehandlerClass {
	constructor(adapter) {
		this.adapter = adapter;

		// declare the directories and entries of Ttn data
		this.ttn = {
			name: "ttn",
			directory:{
				application:{
					keyName: "application",
					directoryName: "application",	// general directoryname
					commonName: "application",		// name of the object
					type: "channel"					// type of the object
				},
				devices:{
					keyName: "devices",
					directoryName: "devices",
					commonName: "devices",
					type: "folder"
				},
				deviceUid:{
					keyName: "deviceUid",
					directoryName: "deviceUid",
					type: "folder"
				},
				deviceId:{
					keyName: "deviceId",
					directoryName: "deviceId",
					type: "device"
				},
				uplink:{
					keyName: "uplink",
					directoryName: "uplink",
					commonName: "uplinkdata",
					type: "folder"
				},
				uplinkRaw:{
					keyName: "uplinkRaw",
					directoryName: "raw",
					commonName: "rawdata of uplink",
					type: "folder"
				},
				uplinkDecoded:{
					keyName: "uplinkDecoded",
					directoryName: "decoded",
					commonName: "decoded values",
					type: "folder"
				},
				uplinkValues:{
					keyName: "uplinkValues",
					directoryName: "values",
					commonName: "values",
					type: "folder"
				},
				downlink:{
					keyName: "downlink",
					directoryName: "downlink",
					commonName: "downlinkdata",
					type: "folder"
				},
				downlinkRaw:{
					keyName: "downlinkRaw",
					directoryName: "raw",
					commonName: "rawdata of downlink",
					type: "folder"
				},
				info:{
					keyName: "info",
					directoryName: "info",
					commonName: "information",
					type: "folder"
				},
			},
			dataEntries: {							// entries, that can be searched for
				end_device_ids: "end_device_ids",
				uplink_message: "uplink_message",
				frm_payload: "frm_payload",
				decoded_payload: "decoded_payload",
				dev_addr: "dev_addr",
				f_port : "f_port",
				downlink_queued: "downlink_queued",
				downlink_sent: "downlink_sent"
			},
			datatypes: {
				base64: "base64",
				json: "json",
				hex: "hex",
				string: "string",
				topic: "topic",
				push: "push",
				replace: "replace"
			},
			writeableData: {
				firmware:{
					name: "firmware",
					downlink: {"downlinks":[{"f_port": 128,"frm_payload":"Pw==","priority": "NORMAL"}]},
					downlink_queued : "downlink_queued",
					downlink_sent : "downlink_sent",
					port: 128
				}
			},
			subscribeableStates: {
				push: "push",
				replace: "replace"
			}
		};

		this.units = {
			"pressure": "mBar",
			"battery": "V",
			"battery_level": "%",
			"humidity": "%",
			"Batterie": "V",
			"Temperatur": "°C",
			"airhumidity": "%",
			"volt": "V",
			"temperatur" : "°C",
			"airtemperature" : "°C"
		};
	}

	getSubscribeableStates(specificDevice){
		// Select data in case of origin
		if(this.adapter.config.ttn){
			return this.getSubscribeableTtnStates(specificDevice);
		}
		else if(this.adapter.config.chirpstack){
			//	 this.getSubscribeableChirpstackValues(specificDevice);
		}
	}

	getSubscribeableTtnStates(specificDevice){
		if(!specificDevice){
			const subscribableStates = {};
			for(const statename of Object.values(this.ttn.subscribeableStates)){
				subscribableStates[statename] = statename;
			}return subscribableStates;
		}
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

		/*********************************************************************
		 * ************************ Main directories *************************
		 * ******************************************************************/

		try{
			for(const directory of Object.values(this.ttn.directory)){
				// @ts-ignore
				const objectId = this.gernerateTtnObjectString(message,directory.keyName);
				await this.adapter.setObjectAsync(objectId,{
					// @ts-ignore
					type: directory.type,
					common: {
						name: directory.commonName ? directory.commonName : "",
					},
					native : {},
				});
			}

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
			if(message[this.ttn.dataEntries.uplink_message]){

				/*********************************************************************
				 * ****************** generate push / replace ************************
				 * ******************************************************************/

				// write push
				let stateId = this.gernerateTtnObjectString(message,this.ttn.directory.downlinkRaw.keyName);
				await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.push}`,{
					type: "state",
					common: {
						name: "push donwlink",
						type: "json",
						role: "value",
						read: true,
						write: true,
						def: JSON.stringify({"downlinks":[{"f_port": 128,"frm_payload":"Pw==","priority": "NORMAL"}]})
					},
					native: {},
				});

				// write replace
				await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.replace}`,{
					type: "state",
					common: {
						name: "replace downlink",
						type: "json",
						role: "value",
						read: true,
						write: true,
						def: JSON.stringify({"downlinks":[{"f_port": 128,"frm_payload":"Pw==","priority": "NORMAL"}]})
					},
					native: {},
				});

				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				// write json
				stateId = this.gernerateTtnObjectString(message,this.ttn.directory.uplinkRaw.keyName);
				await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.json}`,{
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
				await this.adapter.setStateAsync(`${stateId}.${this.ttn.datatypes.json}`,JSON.stringify(message),true);

				/*********************************************************************
				 * ********************** Rawdata (Base64) ***************************
				 * ******************************************************************/

				// check for frm payload
				const startTag = this.ttn.dataEntries.uplink_message;
				if(message[startTag][this.ttn.dataEntries.frm_payload]){

					// wite base64 data
					await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.base64}`,{
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
					const writedata = message[startTag][this.ttn.dataEntries.frm_payload];
					await this.adapter.setStateAsync(`${stateId}.${this.ttn.datatypes.base64}`,writedata,true);

					// write base64 data in hex data
					await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.hex}`,{
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
					const hexdata = Buffer.from(message[startTag][this.ttn.dataEntries.frm_payload], "base64").toString("hex");
					await this.adapter.setStateAsync(`${stateId}.${this.ttn.datatypes.hex}`,hexdata,true);

					// write base64 data in string data
					await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.string}`,{
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
					const stringdata = Buffer.from(message[startTag][this.ttn.dataEntries.frm_payload], "base64").toString();
					await this.adapter.setStateAsync(`${stateId}.${this.ttn.datatypes.string}`,stringdata,true);
				}

				/*********************************************************************
				 * ********************** decoded payload ****************************
				 * ******************************************************************/

				if(message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.decoded_payload]){
					for(const endpoint in message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.decoded_payload]){
						//just write data in case there is no ignored endpoint
						const stateId = this.gernerateTtnObjectString(message,this.ttn.directory.uplinkDecoded.keyName);

						// generate writedata
						let writedata = message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.decoded_payload][endpoint];
						// @ts-ignore
						await this.adapter.setObjectNotExistsAsync(`${stateId}.${endpoint}`,{
							type: "state",
							common: {
								name: "",
								type: typeof writedata !== "object" ? typeof writedata : "json",
								role: "value",
								unit: this.units[endpoint] ? this.units[endpoint] : undefined,
								read: true,
								write: false
							},
							native: {},
						});
						if(typeof writedata === "object"){
							writedata = JSON.stringify(writedata);
						}
						await this.adapter.setStateAsync(`${stateId}.${endpoint}`,writedata,true);
					}
				}
			}

			/*********************************************************************
			 * ************************* Downlink data ***************************
			 * ******************************************************************/

			// check for uplink message
			if(message[this.ttn.dataEntries.downlink_queued] || message[this.ttn.dataEntries.downlink_sent]){
				/*********************************************************************
				 * ************************ Rawdata json *****************************
				 * ******************************************************************/

				// write json
				const stateId = this.gernerateTtnObjectString(message,this.ttn.directory.downlinkRaw.keyName);
				await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.json}`,{
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
				await this.adapter.setStateAsync(`${stateId}.${this.ttn.datatypes.json}`,JSON.stringify(message),true);

				/*********************************************************************
				 * ********************** Rawdata (Base64) ***************************
				 * ******************************************************************/

				// check for frm payload
				let startTag = this.ttn.dataEntries.downlink_queued;
				if(!message[startTag]){
					startTag = this.ttn.dataEntries.downlink_sent;
				}
				if(message[startTag][this.ttn.dataEntries.frm_payload]){
					// wite base64 data
					await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.base64}`,{
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
					const writedata = message[startTag][this.ttn.dataEntries.frm_payload];
					await this.adapter.setStateAsync(`${stateId}.${this.ttn.datatypes.base64}`,writedata,true);

					// write base64 data in hex data
					await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.hex}`,{
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
					const hexdata = Buffer.from(message[startTag][this.ttn.dataEntries.frm_payload], "base64").toString("hex");
					await this.adapter.setStateAsync(`${stateId}.${this.ttn.datatypes.hex}`,hexdata,true);

					// write base64 data in string data
					await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.string}`,{
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
					const stringdata = Buffer.from(message[startTag][this.ttn.dataEntries.frm_payload], "base64").toString();
					await this.adapter.setStateAsync(`${stateId}.${this.ttn.datatypes.string}`,stringdata,true);
				}

			}
		}
		catch(error){
			this.adapter.log.warn("check: " + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}

	/*********************************************************************
	 * ************************ Objectstring *****************************
	 * ******************************************************************/

	gernerateTtnObjectString(message,resolvetype){
		switch(resolvetype){
			case this.ttn.directory.application.keyName:
				return message.end_device_ids.application_ids.application_id;

			case this.ttn.directory.devices.keyName:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.directoryName}`;

			case this.ttn.directory.deviceUid.keyName:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.directoryName}.${message.end_device_ids.dev_eui}`;

			case this.ttn.directory.deviceId.keyName:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.directoryName}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}`;

			case this.ttn.directory.uplink.keyName:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.directoryName}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}.${this.ttn.directory.uplink.directoryName}`;

			case this.ttn.directory.uplinkRaw.keyName:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.directoryName}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}.${this.ttn.directory.uplink.directoryName}.${this.ttn.directory.uplinkRaw.directoryName}`;

			case this.ttn.directory.uplinkValues.keyName:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.directoryName}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}.${this.ttn.directory.uplink.directoryName}.${this.ttn.directory.uplinkValues.directoryName}`;

			case this.ttn.directory.uplinkDecoded.keyName:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.directoryName}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}.${this.ttn.directory.uplink.directoryName}.${this.ttn.directory.uplinkDecoded.directoryName}`;

			case this.ttn.directory.downlink.keyName:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.directoryName}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}.${this.ttn.directory.downlink.directoryName}`;

			case this.ttn.directory.downlinkRaw.keyName:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.directoryName}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}.${this.ttn.directory.downlink.directoryName}.${this.ttn.directory.downlinkRaw.directoryName}`;

			case this.ttn.directory.info.keyName:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.directoryName}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}.${this.ttn.directory.info.directoryName}`;
		}
	}

	/*********************************************************************
	 * *********************** Downlinktopic *****************************
	 * ******************************************************************/

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

	/*async handleChirpstackMessage(topic,message){

	}*/

	getDownlinkTopic(id,suffix){
		// Select datahandling in case of origin
		if(this.adapter.config.ttn){
			return this.getTtnDownlinkTopicFromDirektory(id,suffix);
		}
		else if(this.adapter.config.chirpstack){
			//	 this.handleChirpstack(topic,message);
		}
	}
}

module.exports = messagehandlerClass;