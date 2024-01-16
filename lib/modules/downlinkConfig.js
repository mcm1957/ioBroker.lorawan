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

	getDownlinkConfig(changeInfo,options){
		const activeFunction = "getDownlinkConfig";
		try{
			let downlinkConfig = undefined;
			for(const deviceType in this.activeDownlinkConfigs){
				if(changeInfo.deviceType.indexOf(deviceType) === 0 || deviceType === "all"){
					if(this.activeDownlinkConfigs[deviceType][changeInfo.changedState]){
						downlinkConfig = this.activeDownlinkConfigs[deviceType][changeInfo.changedState];
						break;
					}
				}
			}
			if(downlinkConfig !== undefined)
			{
				return downlinkConfig;
			}
			else{
				if(options && options.startupCheck){
					if(changeInfo.deviceType === ""){
						this.adapter.log.warn(`${activeFunction}: the downlinkstate ${changeInfo.changedState} is not configed in devices without a typedefinition.`);
					}
					else{
						this.adapter.log.warn(`${activeFunction}: the downlinkstate ${changeInfo.changedState} is not configed in devices with the typ: ${changeInfo.deviceType}`);
					}
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