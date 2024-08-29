class assignhandlerClass {
	constructor(adapter) {
		this.adapter = adapter;

		this.assign = {
			OPEN: {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "sensor"
						}
					}
				}
			},
			soiltemperature: {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "value.temperature",
							unit: "°C"
						}
					}
				}
			},
			soilmoisture : {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "value",
							unit: "vol-%"
						}
					}
				}
			},
			soilconductivity : {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "value",
							unit: "µs/cm"
						}
					}
				}
			},
			volt: {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "value.voltage",
							unit: "V"
						}
					}
				}
			},
			Open: {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "sensor.window"
						}
					}
				}
			},
			Door_Open: {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "sensor.door"
						}
					}
				}
			},
			Contact: {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "sensor"
						}
					}
				}
			},
			WindowOpen: {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "sensor.window"
						}
					}
				}
			},
			DoorOpen: {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "sensor.door"
						}
					}
				}
			},
			targetTemperature: {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "level.temperature",
							unit: "°C"
						}
					}
				}
			},
			targetTemperatureFloat: {
				approvedFolders: {
					"uplink.decoded": {
						assignfunction: this.commonAssign,
						common: {
							role: "level.temperature",
							unit: "°C"
						}
					}
				}
			}
		};

	}

	/*********************************************************************
	 * ********************* Execution of Assigns  ***********************
	 * ******************************************************************/

	async executeAssign(id,value,assigndata,options){
		const activeFunction = "executeAssign";
		this.adapter.log.debug(`Function ${activeFunction} started.`);
		try{
			// check folder
			const baseInfo = this.adapter.getBaseDeviceInfo(id);
			const subfolder = id.slice(baseInfo.objectStartDirectory.length + 1,id.length - baseInfo.changedState.length - 1);
			if(assigndata.approvedFolders && assigndata.approvedFolders[subfolder]){
				return assigndata.approvedFolders[subfolder].assignfunction(id,value,assigndata.approvedFolders[subfolder],options);
			}
		}
		catch(error){
			this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
		}
	}

	/*********************************************************************
	 * ******************* Assign of common values ***********************
	 * ******************************************************************/

	async commonAssign(id,value,assigndata,options){
		for(const element in assigndata.common){
			options.common[element] = assigndata.common[element];
		}
		return value;
	}
}

module.exports = assignhandlerClass;