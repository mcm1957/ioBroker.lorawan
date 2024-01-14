class downlinkConfigClass {
	constructor(adapter) {
		this.adapter = adapter;
		//this.presentConfigs = {};

		this.internalDownlinks = [
			{
				name: "push",
				type: "json",
				deviceType: "all"
			},
			{
				name: "replace",
				type: "json",
				deviceType: "all"
			}
		];

		this.activeDownlinkConfigs = {};
	}

	addDownlinkConfigByType(downlinkConfig){
		if(!this.activeDownlinkConfigs[downlinkConfig.deviceType]){
			this.activeDownlinkConfigs[downlinkConfig.deviceType] = {};
		}
		if(!this.activeDownlinkConfigs[downlinkConfig.deviceType][downlinkConfig.name]){
			this.activeDownlinkConfigs[downlinkConfig.deviceType][downlinkConfig.name] = downlinkConfig;
		}
	}
/*
	addConfigToPresentIdList(downlinkConfig,id){
		// Check if the Config is general, or an model specific.
		this.presentConfigs[id] = downlinkConfig;
	}
*/
	getDownlinkConfig(changeInfo){
		const activeFunction = "getDownlinkConfig";
		try{
			if(this.activeDownlinkConfigs[changeInfo.deviceType] && this.activeDownlinkConfigs[changeInfo.deviceType][changeInfo.changedState])
			{
				return this.activeDownlinkConfigs[changeInfo.deviceType][changeInfo.changedState];
			}
			else{
				changeInfo.deviceType = "all";
				if(this.activeDownlinkConfigs[changeInfo.deviceType] && this.activeDownlinkConfigs[changeInfo.deviceType][changeInfo.changedState])
				{
					return this.activeDownlinkConfigs[changeInfo.deviceType][changeInfo.changedState];
				}
				else{
					this.adapter.log.warn(`${activeFunction}: no downlinkConfig found: deviceType: ${changeInfo.deviceType} - changed state: ${changeInfo.changedState}`);
				}
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}: ` + error);
		}
	}
}

module.exports = downlinkConfigClass;