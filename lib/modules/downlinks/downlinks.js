
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
				on: "11",
				off: "11",
				multiplyfaktor: 60,
				unit: "min",
				deviceType: "Dragino",
				isConfiguration: true
			}
		];
		if(adapter.config.origin === "ttn"){
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
		}
		else if(adapter.config.origin === "chirpstack"){
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