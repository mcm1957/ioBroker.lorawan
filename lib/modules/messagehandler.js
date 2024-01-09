class messagehandlerClass {
	constructor(adapter) {
		this.adapter = adapter;

		// declare the directories and entries of Ttn data
		this.ttn = {
			name: "ttn",
			directory:{
				application:{
					name: "application",		// general directoryname
					commonName: "application",	// name of the object
					type: "channel"				// type of the object
				},
				devices:{
					name: "devices",
					commonName: "devices",
					type: "folder"
				},
				deviceUid:{
					name: "deviceUid",
					type: "folder"
				},
				deviceId:{
					name: "deviceId",
					type: "device"
				},
				raw:{
					name: "raw",
					commonName: "rawdata",
					type: "folder"
				},
				info:{
					name: "info",
					commonName: "information",
					type: "folder"
				},
				values:{
					name: "values",
					commonName: "values",
					type: "folder",
					ignoredValues:{
						data: "data"
					}
				}
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
				topic: "topic"
			},
			writeableData: {
				firmware:{
					name: "firmware",
					downlink: {"downlinks":[{"f_port": 128,"frm_payload":"Pw==","priority": "NORMAL"}]},
					downlink_queued : "downlink_queued",
					downlink_sent : "downlink_sent",
					port: 128
				}
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
				const objectId = this.gernerateTtnObjectString(message,directory.name);
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
			 * ************************ Rawdata json *****************************
			 * ******************************************************************/

			// write json
			let stateId = this.gernerateTtnObjectString(message,this.ttn.directory.raw.name);
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

			// write topic
			await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.datatypes.topic}`,{
				type: "state",
				common: {
					name: "last recieved topic",
					type: "string",
					role: "value",
					read: true,
					write: false
				},
				native: {},
			});
			await this.adapter.setStateAsync(`${stateId}.${this.ttn.datatypes.topic}`,topic,true);

			/*********************************************************************
			 * ************************* Infodata ********************************
			 * ******************************************************************/

			//write infodata
			if(message[this.ttn.dataEntries.end_device_ids][this.ttn.dataEntries.dev_addr]){

				// generate writedata
				let writedata = message[this.ttn.dataEntries.end_device_ids][this.ttn.dataEntries.dev_addr];

				stateId = this.gernerateTtnObjectString(message,this.ttn.directory.info.name);
				await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.dataEntries.dev_addr}`,{
					type: "state",
					common: {
						name: "address of device",
						type: typeof writedata !== "object" ? typeof writedata : "json",
						role: "value",
						read: true,
						write: false
					},
					native: {},
				});
				if(typeof writedata === "object"){
					writedata = JSON.stringify(writedata);
				}
				await this.adapter.setStateAsync(`${stateId}.${this.ttn.dataEntries.dev_addr}`,writedata,true);
			}

			// generate the state for the firmware
			stateId = this.gernerateTtnObjectString(message,this.ttn.directory.info.name);
			await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.writeableData.firmware.name}`,{
				type: "state",
				common: {
					name: "firmware of device",
					type: "string",
					role: "value",
					read: true,
					write: true,
					def: "",
				},
				native: {},
			});
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

			/*********************************************************************
			 * ********************** Uplink data ********************************
			 * ******************************************************************/

			// check for uplink message
			if(message[this.ttn.dataEntries.uplink_message]){

				/*********************************************************************
				 * ********************** decoded payload ****************************
				 * ******************************************************************/

				if(message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.decoded_payload]){
					for(const endpoint in message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.decoded_payload]){
						//just write data in case there is no ignored endpoint
						const stateId = this.gernerateTtnObjectString(message,this.ttn.directory.values.name);

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

				/*********************************************************************
				 * ********************** Rawdata (Base64)****************************
				 * ******************************************************************/

				// write rawdata
				const stateId = this.gernerateTtnObjectString(message,this.ttn.directory.raw.name);

				// check for frm payload
				let startTag = this.ttn.dataEntries.uplink_message;
				if(!startTag){
					startTag = this.ttn.dataEntries.downlink_queued;
				}
				if(!startTag){
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
			case this.ttn.directory.application.name:
				return message.end_device_ids.application_ids.application_id;

			case this.ttn.directory.devices.name:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.name}`;

			case this.ttn.directory.deviceUid.name:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.name}.${message.end_device_ids.dev_eui}`;

			case this.ttn.directory.deviceId.name:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.name}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}`;

			case this.ttn.directory.raw.name:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.name}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}.${this.ttn.directory.raw.name}`;

			case this.ttn.directory.info.name:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.name}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}.${this.ttn.directory.info.name}`;

			case this.ttn.directory.values.name:
				return `${message.end_device_ids.application_ids.application_id}.${this.ttn.directory.devices.name}.${message.end_device_ids.dev_eui}.${message.end_device_ids.device_id}.${this.ttn.directory.values.name}`;
		}
	}

	/*********************************************************************
	 * *********************** Downlinktopic *****************************
	 * ******************************************************************/

	getTtnDownlinkTopicFromDirektory(id,suffix){
		id = id.substring(this.adapter.namespace.length + 1,id.length);
		const idElements = id.split(".");
		this.adapter.log.debug(JSON.stringify(idElements));
		const topicElements = {};
		topicElements.Version = "v3";
		topicElements.appicationId = `/${idElements[0]}`;
		topicElements.applicationFrom = "@ttn";
		topicElements.devices = `/${idElements[1]}`;
		topicElements.deviceUid = `/${idElements[3]}`;
		topicElements.suffix = suffix;
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