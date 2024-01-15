const downlinkClass = require("./downlinks/downlinks");

class downlinkConfigClass {
	constructor(adapter) {
		this.adapter = adapter;
		//this.presentConfigs = {};

		this.downlinks = new downlinkClass();
		this.activeDownlinkConfigs = {};
	}

	addAndMergeDownlinks(){
		// @ts-ignore
		for(const downlinkConfig of Object.values(this.downlinks.internalDownlinks)){
			this.addDownlinkConfigByType(downlinkConfig);
		}
		for(const downlinkConfig of Object.values(this.adapter.config.downlinkConfigAccordion)){
			this.addDownlinkConfigByType(downlinkConfig);
		}
	}

	addDownlinkConfigByType(downlinkConfig){
		if(!this.activeDownlinkConfigs[downlinkConfig.deviceType]){
			this.activeDownlinkConfigs[downlinkConfig.deviceType] = {};
		}
		if(!this.activeDownlinkConfigs[downlinkConfig.deviceType][downlinkConfig.name]){
			this.activeDownlinkConfigs[downlinkConfig.deviceType][downlinkConfig.name] = downlinkConfig;
		}
	}

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