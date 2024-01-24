
class downlinksClass {
	constructor(adapter) {
		this.internalDownlinks = [
			{
				name: "Intervall",
				port: 1,
				priority: "NORMAL",
				type: "number",
				confirmed: false,
				front: "01",
				end: "",
				length: 8,
				on: "",
				off: "",
				multiplyfaktor: 60,
				unit: "min",
				deviceType: "Dragino",
				isConfiguration: true
			},
			{
				name: "Reboot",
				port: 1,
				priority: "NORMAL",
				type: "button",
				confirmed: false,
				front: "",
				end: "",
				length: 4,
				on: "",
				off: "",
				onClick: "04FF",
				multiplyfaktor: "1",
				unit: "",
				deviceType: "Dragino"
			},
			{
				name: "RO1_target",
				port: 1,
				priority: "NORMAL",
				type: "boolean",
				confirmed: true,
				front: "030111",
				end: "11",
				length: 8,
				on: "030111",
				off: "030011",
				multiplyfaktor: "1",
				unit: "",
				deviceType: "Dragino LT22222",
				onClick: "030111"
			},
			{
				name: "Intervall",
				port: 1,
				priority: "NORMAL",
				type: "number",
				confirmed: false,
				front: "01",
				end: "",
				length: 8,
				on: "11",
				off: "11",
				multiplyfaktor: 60,
				unit: "Minuten",
				deviceType: "Dragino LT22222",
				onClick: "030111"
			},
			{
				name: "RO2_target",
				port: 1,
				priority: "NORMAL",
				type: "boolean",
				confirmed: true,
				front: "03",
				end: "11",
				length: 2,
				on: "031101",
				off: "031100",
				multiplyfaktor: "1",
				unit: "",
				deviceType: "Dragino LT22222",
				onClick: "030111"
			},
			{
				name: "RPC_Level",
				port: 2,
				priority: "NORMAL",
				type: "boolean",
				confirmed: false,
				front: "03",
				end: "11",
				length: 2,
				on: "2104",
				off: "2100",
				multiplyfaktor: "1",
				unit: "",
				deviceType: "Dragino LT22222",
				onClick: "030111"
			},
			{
				name: "DO1_target",
				port: 1,
				priority: "NORMAL",
				type: "boolean",
				confirmed: true,
				front: "03",
				end: "11",
				length: 2,
				on: "02011111",
				off: "02001111",
				multiplyfaktor: "1",
				unit: "",
				deviceType: "Dragino LT22222",
				onClick: "030111"
			},
			{
				name: "DO2_target",
				port: 1,
				priority: "NORMAL",
				type: "boolean",
				confirmed: true,
				front: "03",
				end: "11",
				length: 2,
				on: "02110111",
				off: "02110011",
				multiplyfaktor: "1",
				unit: "",
				deviceType: "Dragino LT22222",
				onClick: "030111"
			},
			{
				name: "DO1_L_FOR_2_SEC",
				port: 1,
				priority: "NORMAL",
				type: "boolean",
				confirmed: false,
				front: "03",
				end: "11",
				length: 2,
				on: "A90001111107D0",
				off: "",
				multiplyfaktor: "1",
				unit: "",
				deviceType: "Dragino LT22222",
				onClick: "030111"
			},
			{
				name: "RO2_On_FOR_1_Min",
				port: 1,
				priority: "NORMAL",
				type: "boolean",
				confirmed: true,
				front: "03",
				end: "11",
				length: 2,
				on: "050021EA60",
				off: "",
				multiplyfaktor: "1",
				unit: "",
				deviceType: "Dragino LT22222",
				onClick: "030111"
			}
		];
		// Select downlink in case of origin
		switch(adapter.config.origin){
			case "ttn":
				this.internalDownlinks.unshift(
					// @ts-ignore
					{
						name: "push",
						type: "json",
						deviceType: "all"
					},
					{
						name: "replace",
						type: "json",
						deviceType: "all"
					});
				break;
			case "chirpstack":
				this.internalDownlinks.unshift(
				// @ts-ignore
					{
						name: "push",
						type: "json",
						deviceType: "all"
					});
		}
	}


}

module.exports = downlinksClass;