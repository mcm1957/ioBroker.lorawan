class messagehandlerClass {
	constructor(adapter) {
		this.adapter = adapter;

		this.origin = {
			ttn: "ttn",
			chirpstack : "chirpstack"
		};

		this.level = {
			application:{
				name: "application",
				commonName: "application",
				type: "channel"
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
			values:{
				name: "values",
				commonName: "values",
				type: "folder"
			}
		};

		this.dataEentries = {
			ttn: {
				end_device_ids: "end_device_ids",
				uplink_message: "uplink_message",
				frm_payload: "frm_payload",
				decoded_payload: "decoded_payload"
			}
		};

		this.ignoredEndpoints = {
			ttn: {
				data: "data"
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
		// convert messagestring into object
		this.adapter.log.debug("Nachricht: " + message);
		message = JSON.parse(message);

		// Select datahandling in case of origin
		switch(this.getMessageOrigin(message)){
			case this.origin.ttn:
				await this.handleTtn(topic,message);
				break;
			case this.origin.chirpstack:
			//	await this.handleChirpstack(topic,message);
				break;
			default:
				this.adapter.log.debug("Other");
		}
	}

	async handleTtn(topic,message){
		//const stateId = this.generateDeviceString(message.end_device_ids);
		// Generate internal folder for the smoothed values values
		try{
			for(const level of Object.values(this.level)){
				// @ts-ignore
				const objectId = this.gernerateObjectString(message.end_device_ids,level.name);
				await this.adapter.setObjectNotExistsAsync(objectId,{
					// @ts-ignore
					type: level.type,
					common: {
						// @ts-ignore
						name: level.commonName ? level.commonName : `addr. ${message.end_device_ids.dev_addr}`
					},
					native : {},
				});
			}

			// check for uplink message
			if(message[this.dataEentries.ttn.uplink_message]){
				//  check decoded paylod
				if(message[this.dataEentries.ttn.uplink_message][this.dataEentries.ttn.decoded_payload]){
					for(const endpoint in message[this.dataEentries.ttn.uplink_message][this.dataEentries.ttn.decoded_payload]){
						//just write data in case there is no ignored endpoint
						if(!this.ignoredEndpoints.ttn[endpoint]){
							const stateId = this.gernerateObjectString(message.end_device_ids,this.level.values.name);
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
							await this.adapter.setStateAsync(`${stateId}.${endpoint}`,message[this.dataEentries.ttn.uplink_message][this.dataEentries.ttn.decoded_payload][endpoint],true);
						}
					}
				}
			}

			// write rawdata
			const stateId = this.gernerateObjectString(message.end_device_ids,this.level.raw.name);
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

			// check for frm payload
			if(message[this.dataEentries.ttn.uplink_message][this.dataEentries.ttn.frm_payload]){
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
				await this.adapter.setStateAsync(`${stateId}.base64`,message[this.dataEentries.ttn.uplink_message][this.dataEentries.ttn.frm_payload],true);

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
				const hexdata = Buffer.from(message[this.dataEentries.ttn.uplink_message][this.dataEentries.ttn.frm_payload], "base64").toString("hex");
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
				const stringdata = Buffer.from(message[this.dataEentries.ttn.uplink_message][this.dataEentries.ttn.frm_payload], "base64").toString();
				await this.adapter.setStateAsync(`${stateId}.string`,stringdata,true);
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
			case this.level.application.name:
				return end_device_ids.application_ids.application_id;

			case this.level.devices.name:
				return `${end_device_ids.application_ids.application_id}.${this.level.devices.name}`;

			case this.level.device.name:
				return `${end_device_ids.application_ids.application_id}.${this.level.devices.name}.${end_device_ids.dev_eui}`;

			case this.level.raw.name:
				return `${end_device_ids.application_ids.application_id}.${this.level.devices.name}.${end_device_ids.dev_eui}.${this.level.raw.name}`;

			case this.level.values.name:
				return `${end_device_ids.application_ids.application_id}.${this.level.devices.name}.${end_device_ids.dev_eui}.${this.level.values.name}`;
		}
	}

	getMessageOrigin(message){
		if(message.end_device_ids){
			return this.origin.ttn;
		}
		if(message.deduplicationId){
			return this.origin.chirpstack;
		}
	}
}

module.exports = messagehandlerClass;