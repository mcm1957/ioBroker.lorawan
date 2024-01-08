class messagehandlerClass {
	constructor(adapter) {
		this.adapter = adapter;

		// declare the levels and entries of Ttn data
		this.ttn = {
			name: "ttn",
			level:{
				application:{
					name: "application",		// general levelname
					commonName: "application",	// name of the object
					type: "channel"				// type of the object
				},
				devices:{
					name: "devices",
					commonName: "devices",
					type: "folder"
				},
				device:{
					name: "device",
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
				dev_addr: "dev_addr"
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
			await this.handleTtn(topic,message);
		}
		else if(this.adapter.config.chirpstack){
			//	await this.handleChirpstack(topic,message);
		}
	}

	async handleTtn(topic,message){
		//const stateId = this.generateDeviceString(message.end_device_ids);
		// Generate internal folder for the smoothed values values
		try{
			for(const level of Object.values(this.ttn.level)){
				// @ts-ignore
				const objectId = this.gernerateObjectString(message.end_device_ids,level.name);
				await this.adapter.setObjectNotExistsAsync(objectId,{
					// @ts-ignore
					type: level.type,
					native : {},
				});
			}

			// write rawdata
			let stateId = this.gernerateObjectString(message.end_device_ids,this.ttn.level.raw.name);
			await this.adapter.setObjectNotExistsAsync(`${stateId}.json`,{
				type: "state",
				common: {
					name: "",
					type: "json",
					role: "value",
					read: true,
					write: false
				},
				native: {},
			});
			await this.adapter.setStateAsync(`${stateId}.json`,JSON.stringify(message),true);

			//write infodata
			if(message[this.ttn.dataEntries.end_device_ids][this.ttn.dataEntries.dev_addr]){
				stateId = this.gernerateObjectString(message.end_device_ids,this.ttn.level.info.name);
				await this.adapter.setObjectNotExistsAsync(`${stateId}.${this.ttn.dataEntries.dev_addr}`,{
					type: "state",
					common: {
						name: "address of device",
						type: "mixed",
						role: "value",
						read: true,
						write: false
					},
					native: {},
				});
				await this.adapter.setStateAsync(`${stateId}.${this.ttn.dataEntries.dev_addr}`,message[this.ttn.dataEntries.end_device_ids][this.ttn.dataEntries.dev_addr],true);
			}
			// check for uplink message
			if(message[this.ttn.dataEntries.uplink_message]){
				//  check decoded paylod
				if(message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.decoded_payload]){
					for(const endpoint in message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.decoded_payload]){
						//just write data in case there is no ignored endpoint
						const stateId = this.gernerateObjectString(message.end_device_ids,this.ttn.level.values.name);
						// @ts-ignore
						await this.adapter.setObjectNotExistsAsync(`${stateId}.${endpoint}`,{
							type: "state",
							common: {
								name: "",
								type: "mixed",
								role: "value",
								unit: this.units[endpoint] ? this.units[endpoint] : undefined,
								read: true,
								write: false
							},
							native: {},
						});
						let writedata = message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.decoded_payload][endpoint];
						if(typeof writedata === "object"){
							writedata = JSON.stringify(writedata);
						}
						await this.adapter.setStateAsync(`${stateId}.${endpoint}`,writedata,true);
					}
				}

				// write rawdata
				const stateId = this.gernerateObjectString(message.end_device_ids,this.ttn.level.raw.name);

				// check for frm payload
				if(message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.frm_payload]){
					// wite base64 data
					await this.adapter.setObjectNotExistsAsync(`${stateId}.base64`,{
						type: "state",
						common: {
							name: "",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					await this.adapter.setStateAsync(`${stateId}.base64`,message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.frm_payload],true);

					// write base64 data in hex data
					await this.adapter.setObjectNotExistsAsync(`${stateId}.hex`,{
						type: "state",
						common: {
							name: "",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const hexdata = Buffer.from(message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.frm_payload], "base64").toString("hex");
					await this.adapter.setStateAsync(`${stateId}.hex`,hexdata,true);

					// write base64 data in string data
					await this.adapter.setObjectNotExistsAsync(`${stateId}.string`,{
						type: "state",
						common: {
							name: "",
							type: "string",
							role: "value",
							read: true,
							write: false
						},
						native: {},
					});
					const stringdata = Buffer.from(message[this.ttn.dataEntries.uplink_message][this.ttn.dataEntries.frm_payload], "base64").toString();
					await this.adapter.setStateAsync(`${stateId}.string`,stringdata,true);
				}
			}
		}
		catch(error){
			this.adapter.log.warn("check: " + error);
			this.adapter.log.warn("Message: " + JSON.stringify(message));
		}
	}

	/*async handleChirpstack(topic,message){

	}*/

	gernerateObjectString(end_device_ids,resolvetype){
		switch(resolvetype){
			case this.ttn.level.application.name:
				return end_device_ids.application_ids.application_id;

			case this.ttn.level.devices.name:
				return `${end_device_ids.application_ids.application_id}.${this.ttn.level.devices.name}`;

			case this.ttn.level.device.name:
				return `${end_device_ids.application_ids.application_id}.${this.ttn.level.devices.name}.${end_device_ids.dev_eui}`;

			case this.ttn.level.raw.name:
				return `${end_device_ids.application_ids.application_id}.${this.ttn.level.devices.name}.${end_device_ids.dev_eui}.${this.ttn.level.raw.name}`;

			case this.ttn.level.info.name:
				return `${end_device_ids.application_ids.application_id}.${this.ttn.level.devices.name}.${end_device_ids.dev_eui}.${this.ttn.level.info.name}`;

			case this.ttn.level.values.name:
				return `${end_device_ids.application_ids.application_id}.${this.ttn.level.devices.name}.${end_device_ids.dev_eui}.${this.ttn.level.values.name}`;
		}
	}
}

module.exports = messagehandlerClass;