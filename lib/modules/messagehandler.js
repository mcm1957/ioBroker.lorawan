class messagehandlerClass {
	constructor(adapter) {
		this.adapter = adapter;
		this.level = {
			application:{
				name: "Application",
				commonName: "Application",
				type: "channel"
			},
			devices:{
				name: "Devices",
				commonName: "Devices",
				type: "folder"
			},
			device:{
				name: "Device",
				type: "device"
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

	async handleMessage(application,topic,message){
		message = JSON.parse(message);
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
		catch(error){
			this.adapter.log.warn("check: " + error);
		}
	}

	gernerateObjectString(end_device_ids,resolvetype){
		switch(resolvetype){
			case this.level.application.name:
				return end_device_ids.application_ids.application_id;

			case this.level.devices.name:
				return `${end_device_ids.application_ids.application_id}.devices`;

			case this.level.device.name:
				return `${end_device_ids.application_ids.application_id}.devices.${end_device_ids.dev_eui}`;
		}
	}
}

module.exports = messagehandlerClass;