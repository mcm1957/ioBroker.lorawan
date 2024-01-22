
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