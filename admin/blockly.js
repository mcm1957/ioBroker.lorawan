"use strict";

// @ts-ignore
if (typeof goog !== "undefined") {
	// @ts-ignore
	// eslint-disable-next-line no-undef
	goog.provide("Blockly.JavaScript.Sendto");
	// @ts-ignore
	// eslint-disable-next-line no-undef
	goog.require("Blockly.JavaScript");
}


// --- general translations --------------------------------------------------
Blockly.Words["anyInstance"]   = {"en": "all instances","pt": "todas as instâncias","pl": "wszystkie przypadki","nl": "alle instanties","it": "tutte le istanze","es": "todas las instancias","fr": "toutes les instances","de": "Alle Instanzen","ru": "На все драйвера"};
Blockly.Words["lorawanDeviceEUI"] = {"en": "device EUI","de": "Geräte EUI","ru": "устройство EUI","pt": "dispositivo EUI","nl": "apparaat EUI","fr": "dispositif IUE","it": "dispositivo EUI","es": "dispositivo EUI","pl": "urządzenie EUI","uk": "пристрій EUI","zh-cn": "设备 EUI"};

/**************************************************************************
******************************Get Device Info******************************
**************************************************************************/

// --- Get DeviceInfo translations --------------------------------------------------
Blockly.Words["lorawanGetDeviceInfo"] = {"en": "lorawan Device Info", "de": "lorawan Geräteinfo", "ru": "lorawan Device Info", "pt": "lorawan Informações do dispositivo", "nl": "lorawan Apparaatinformatie", "fr": "lorawan Informations sur le périphérique", "it": "lorawan Dispositivi Info", "es": "lorawan Device Info", "pl": "informacje o urządzeniu Lorawan", "uk": "інформація про пристрій lorawan", "zh-cn": "lorawan 设备信息"};
Blockly.Words["lorawanGetDeviceInfotooltip"] = {"en": "get Informations about the device with the given device EUI", "de": "informationen über das Gerät mit der angegebenen Geräte EUI", "ru": "получить информацию об устройстве с данным устройством EUI", "pt": "obter informações sobre o dispositivo com o dispositivo dado EUI", "nl": "informatie over het apparaat met het gegeven apparaat opvragen EUI", "fr": "obtenir des informations sur l'appareil avec l'appareil donné IUE", "it": "ottenere informazioni sul dispositivo con il dispositivo fornito EUI", "es": "obtener Información sobre el dispositivo con el dispositivo dado EUI", "pl": "pobierz informacje o urządzeniu z podanym urządzeniem EUI", "uk": "отримувати інформацію про пристрій з заданим пристроєм EUI", "zh-cn": "用指定的设备获取设备信息 EUI"};

// eslint-disable-next-line no-undef
Blockly.Sendto.blocks["lorawanGetDeviceInfo"] =
    "<block type='lorawanGetDeviceInfo'>"
    + "     <value name='INSTANCE'>"
    + "     </value>"
    + "     <value name='deviceEUI'>"
    + "         <shadow type='text'>"
    + "             <field name='TEXT'>text</field>"
    + "         </shadow>"
    + "     </value>"
    + "</block>";

// eslint-disable-next-line no-undef
Blockly.Blocks["lorawanGetDeviceInfo"] = {
	init: function() {
		const options = [[Blockly.Translate("anyInstance"), ""]];
		if (typeof main !== "undefined" && main.instances) {
			for (let i = 0; i < main.instances.length; i++) {
				let m = main.instances[i].match(/^system.adapter.lorawan.(\d+)$/);
				if (m) {
					let k = parseInt(m[1], 10);
					options.push(["lorawan." + k, "." + k]);
				}
			}
			if (options.length === 0) {
				for (let u = 0; u <= 4; u++) {
					options.push(["lorawan." + u, "." + u]);
				}
			}
		} else {
			for (let n = 0; n <= 4; n++) {
				options.push(["lorawan." + n, "." + n]);
			}
		}

		this.appendDummyInput("INSTANCE")
			.appendField(Blockly.Translate("lorawanGetDeviceInfo"))
			.appendField(new Blockly.FieldDropdown(options), "INSTANCE");

		this.appendValueInput("deviceEUI")
			.appendField(Blockly.Translate("lorawanDeviceEUI"));

		this.setColour(Blockly.Sendto.HUE);
		this.setTooltip(Blockly.Translate("lorawanGetDeviceInfotooltip"));
	}
};

Blockly.JavaScript["lorawanGetDeviceInfo"] = function(block){
	const dropdown_instance = block.getFieldValue("INSTANCE");
	const value_devEUI = Blockly.JavaScript.valueToCode(block, "deviceEUI", Blockly.JavaScript.ORDER_ATOMIC);
	return 'sendTo("lorawan' + dropdown_instance + '", "getDeviceInfo", {deviceEUI: ' +   value_devEUI  + "}, async (result) => {console.log(result);});";
};

/**************************************************************************
*********************************Get uplink********************************
**************************************************************************/

// --- Get DeviceInfo translations --------------------------------------------------
Blockly.Words["lorawanGetUplink"] = {"en": "lorawan uplinkinfo", "de": "lorawan uplinkinfo", "ru": "lorawan uplinkinfo", "pt": "o que fazer", "nl": "lorawan uplinkinfo", "fr": "lorawan uplinkinfo", "it": "condividi su google", "es": "lorawan uplinkinfo", "pl": "lorawan uplinkinfo", "uk": "український", "zh-cn": "lorawan 上行链接信息"};
Blockly.Words["lorawanGetUplinktooltip"] = {"en": "get information about the given uplink", "de": "informationen zum angegebenen uplink", "ru": "получить информацию об отказе от ссылки", "pt": "obter informações sobre o link fornecido", "nl": "informatie krijgen over de opgegeven uplink", "fr": "obtenir des informations sur le lien ascendant donné", "it": "ottenere informazioni su il link up", "es": "obtener información sobre el enlace dado", "pl": "uzyskać informacje o danym łączniku", "uk": "отримувати інформацію про задану посилання", "zh-cn": "获取上行链路的信息"};
Blockly.Words["lorawanUplink"] = {"en": "uplink","de": "uplink","ru": "uplink", "pt": "o que é","nl": "uplink","fr": "lien ascendant","it": "uplink","es": "subtítulos","pl": "link","uk": "посилання","zh-cn": "上行链接"};
Blockly.Words["lorawanSubfolder"] = {"en": "subfolder", "de": "unterordner", "ru": "subfolder", "pt": "subpastas", "nl": "submap", "fr": "sous-dossier", "it": "sottocartella", "es": "subcarpeta", "pl": "podfolder", "uk": "підпалювач", "zh-cn": "子文件夹"};

// eslint-disable-next-line no-undef
Blockly.Sendto.blocks["lorawanGetUplink"] =
    "<block type='lorawanGetUplink'>"
    + "     <value name='INSTANCE'>"
    + "     </value>"
    + "     <value name='deviceEUI'>"
    + "         <shadow type='text'>"
    + "             <field name='TEXT'>text</field>"
    + "         </shadow>"
    + "     </value>"
    + "     <value name='uplink'>"
    + "         <shadow type='text'>"
    + "             <field name='TEXT'>text</field>"
    + "         </shadow>"
    + "     </value>"
    + "     <value name='subfolder'>"
    + "         <shadow type='text'>"
    + "             <field name='TEXT'>decoded</field>"
    + "         </shadow>"
    + "     </value>"
    + "</block>";

// eslint-disable-next-line no-undef
Blockly.Blocks["lorawanGetUplink"] = {
	init: function() {
		const options = [[Blockly.Translate("anyInstance"), ""]];
		if (typeof main !== "undefined" && main.instances) {
			for (let i = 0; i < main.instances.length; i++) {
				let m = main.instances[i].match(/^system.adapter.lorawan.(\d+)$/);
				if (m) {
					let k = parseInt(m[1], 10);
					options.push(["lorawan." + k, "." + k]);
				}
			}
			if (options.length === 0) {
				for (let u = 0; u <= 4; u++) {
					options.push(["lorawan." + u, "." + u]);
				}
			}
		} else {
			for (let n = 0; n <= 4; n++) {
				options.push(["lorawan." + n, "." + n]);
			}
		}

		this.appendDummyInput("INSTANCE")
			.appendField(Blockly.Translate("lorawanGetUplink"))
			.appendField(new Blockly.FieldDropdown(options), "INSTANCE");

		this.appendValueInput("deviceEUI")
			.appendField(Blockly.Translate("lorawanDeviceEUI"));

		this.appendValueInput("uplink")
			.appendField(Blockly.Translate("lorawanUplink"));

		this.appendValueInput("subfolder")
			.appendField(Blockly.Translate("lorawanSubfolder"));

		this.setColour(Blockly.Sendto.HUE);
		this.setTooltip(Blockly.Translate("lorawanGetUplinktooltip"));
	}
};

Blockly.JavaScript["lorawanGetUplink"] = function(block){
	const dropdown_instance = block.getFieldValue("INSTANCE");
	const value_devEUI = Blockly.JavaScript.valueToCode(block, "deviceEUI", Blockly.JavaScript.ORDER_ATOMIC);
	const value_uplink = Blockly.JavaScript.valueToCode(block, "uplink", Blockly.JavaScript.ORDER_ATOMIC);
	const value_subfolder = Blockly.JavaScript.valueToCode(block, "subfolder", Blockly.JavaScript.ORDER_ATOMIC);
	return 'sendTo("lorawan' + dropdown_instance + '", "getUplink", {deviceEUI: ' +   value_devEUI  + ", uplink: " +   value_uplink + ", subfolder: " + value_subfolder +"}, async (result) => {console.log(result);});";
};

/**************************************************************************
*******************************Set downlink********************************
**************************************************************************/

// --- Get DeviceInfo translations --------------------------------------------------
Blockly.Words["lorawanSetDownlink"] = {"en": "lorawan downlink", "de": "lorawan downlink", "ru": "lorawan downlink", "pt": "para baixo", "nl": "lorawan downlink", "fr": "lorawan lien descendant", "it": "lorawan downlink", "es": "lorawan downlink", "pl": "lorawan downlink", "uk": "логін", "zh-cn": "龙卷风下行链路"};
Blockly.Words["lorawanSetDownlinktooltip"] = {"en": "set downlink", "de": "downlink zur lorawan instanz absetzen", "ru": "set downlink", "pt": "definir link", "nl": "downlink instellen", "fr": "définir la liaison descendante", "it": "impostare il collegamento", "es": "desplazamiento", "pl": "set downlink", "uk": "увійти", "zh-cn": "设置下行链路"};
Blockly.Words["lorawanDownlink"] = {"en": "downlink","de": "downlink","ru": "downlink", "pt": "o que é","nl": "downlink","fr": "lien ascendant","it": "downlink","es": "subtítulos","pl": "link","uk": "посилання","zh-cn": "上行链接"};

// eslint-disable-next-line no-undef
Blockly.Sendto.blocks["lorawanSetDownlink"] =
    "<block type='lorawanSetDownlink'>"
    + "     <value name='INSTANCE'>"
    + "     </value>"
    + "     <value name='deviceEUI'>"
    + "         <shadow type='text'>"
    + "             <field name='TEXT'>text</field>"
    + "         </shadow>"
    + "     </value>"
    + "     <value name='downlink'>"
    + "         <shadow type='text'>"
    + "             <field name='TEXT'>text</field>"
    + "         </shadow>"
    + "     </value>"
    + "     <value name='xxxx'>"
    + "         <shadow type='text'>"
    + "             <field name='xx'>cc</field>"
    + "         </shadow>"
    + "     </value>"
    + "</block>";

// eslint-disable-next-line no-undef
Blockly.Blocks["lorawanSetDownlink"] = {
	init: function() {
		const options = [[Blockly.Translate("anyInstance"), ""]];
		if (typeof main !== "undefined" && main.instances) {
			for (let i = 0; i < main.instances.length; i++) {
				let m = main.instances[i].match(/^system.adapter.lorawan.(\d+)$/);
				if (m) {
					let k = parseInt(m[1], 10);
					options.push(["lorawan." + k, "." + k]);
				}
			}
			if (options.length === 0) {
				for (let u = 0; u <= 4; u++) {
					options.push(["lorawan." + u, "." + u]);
				}
			}
		} else {
			for (let n = 0; n <= 4; n++) {
				options.push(["lorawan." + n, "." + n]);
			}
		}

		this.appendDummyInput("INSTANCE")
			.appendField(Blockly.Translate("lorawanSetDownlink"))
			.appendField(new Blockly.FieldDropdown(options), "INSTANCE");

		this.appendValueInput("deviceEUI")
			.appendField(Blockly.Translate("lorawanDeviceEUI"));

		this.appendValueInput("downlink")
			.appendField(Blockly.Translate("lorawanDownlink"));

		this.setColour(Blockly.Sendto.HUE);
		this.setTooltip(Blockly.Translate("lorawanSetDownlinktooltip"));
	}
};

Blockly.JavaScript["lorawanSetDownlink"] = function(block){
	const dropdown_instance = block.getFieldValue("INSTANCE");
	const value_devEUI = Blockly.JavaScript.valueToCode(block, "deviceEUI", Blockly.JavaScript.ORDER_ATOMIC);
	const value_downlink = Blockly.JavaScript.valueToCode(block, "downlink", Blockly.JavaScript.ORDER_ATOMIC);
	const value_subfolder = Blockly.JavaScript.valueToCode(block, "subfolder", Blockly.JavaScript.ORDER_ATOMIC);
	return 'sendTo("lorawan' + dropdown_instance + '", "setDownlink", {deviceEUI: ' +   value_devEUI  + ", downlink: " +   value_downlink +"}, async (result) => {console.log(result);});";
};