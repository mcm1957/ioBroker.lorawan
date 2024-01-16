
class downlinksClass {
	constructor() {
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
				unit: "min",
				deviceType: "Dragino",
				isConfiguration: true
			}
		];
	}


}

module.exports = downlinksClass;