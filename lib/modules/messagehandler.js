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

			//  write decoded paylod
			if(message["uplink_message"]["decoded_payload"]){
				for(const endpoint in message["uplink_message"]["decoded_payload"]){
					const stateId = this.gernerateObjectString(message.end_device_ids,this.level.device.name);
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
					await this.adapter.setStateAsync(`${stateId}.${endpoint}`,message["uplink_message"]["decoded_payload"][endpoint],true);
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
			await this.adapter.setStateAsync(`${stateId}.base64`,message["uplink_message"]["frm_payload"],true);

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
			await this.adapter.setStateAsync(`${stateId}.hex`,Buffer.from(message["uplink_message"]["frm_payload"], "base64").toString("hex"),true);

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