/**
 * class to handle assignments in case of the state name and folder
 */
class assignhandlerClass {
    /**
     * @param adapter data of the adapter (eg. for logging)
     */
    constructor(adapter) {
        this.adapter = adapter;

        this.assign = {
            Soiltemperature: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            Soilmoisture: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value',
                            unit: 'vol-%',
                        },
                    },
                },
            },
            Soilconductivity: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value',
                            unit: 'µs/cm',
                        },
                    },
                },
            },
            Volt: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            ValveOpenness: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '%',
                        },
                    },
                },
            },
            BatteryVoltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            BatV: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            TempC_SHT: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            TempC_DS: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            Hum_SHT: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.humidity',
                            unit: '%',
                        },
                    },
                },
            },
            LoRa_Voltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            Supply_Voltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            batteryVoltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            Battery: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            BatteryPercent: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.battery',
                            unit: '%',
                        },
                    },
                },
            },
            LowBat: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'indicator.maintenance.lowbat',
                        },
                    },
                },
            },
            Voltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            voltage: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.voltage',
                            unit: 'V',
                        },
                    },
                },
            },
            Contact: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor',
                        },
                    },
                },
            },
            Open: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor',
                        },
                    },
                },
            },
            Opened: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.window',
                        },
                    },
                },
            },
            OpenWindow: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.window',
                        },
                    },
                },
            },
            OpenDoor: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.door',
                        },
                    },
                },
            },
            WindowOpen: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.window',
                        },
                    },
                },
            },
            DoorOpen: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'sensor.door',
                        },
                    },
                },
            },
            TargetTemperature: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level.temperature',
                        },
                    },
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                },
            },
            targetTemperatureFloat: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: '°C',
                        },
                    },
                },
            },
            ExternalTemperatur: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level',
                        },
                    },
                },
            },
            Intervall: {
                approvedFolders: {
                    'downlink.control': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level.timer',
                        },
                    },
                },
            },
            MotorPosition: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.valve',
                            unit: 'INC',
                        },
                    },
                },
            },
            MotorRange: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            unit: 'INC',
                        },
                    },
                },
            },
            Gustspeed: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.speed',
                            unit: 'm/s',
                        },
                    },
                },
            },
            Humidity: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level.humidity',
                            unit: '%',
                        },
                    },
                },
            },
            Light: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.brightness',
                            unit: 'Lux',
                        },
                    },
                },
            },
            Pressure: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.pressure',
                            unit: 'mBar',
                        },
                    },
                },
            },
            Rainfall: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.rain',
                            unit: 'mm',
                        },
                    },
                },
            },
            Temperature: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            Timestamp: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'date',
                        },
                    },
                },
            },
            Uvi: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.uv',
                        },
                    },
                },
            },
            Winddirection: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.direction.wind',
                            unit: '°',
                        },
                    },
                },
            },
            Windspeed: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.speed',
                            unit: 'm/s',
                        },
                    },
                },
            },
            RelativeHumidity: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.humidity',
                        },
                    },
                },
            },
            SensorTemperature: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'value.temperature',
                            unit: '°C',
                        },
                    },
                },
            },
            Mode: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'level.mode.thermostat',
                            states: {
                                0: 'AUTO',
                                1: 'MANUAL',
                                2: 'VACATION',
                            },
                        },
                    },
                },
            },
            BrokenSensor: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'indicator.error',
                        },
                    },
                },
            },
            Alarm: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'indicator.error',
                        },
                    },
                },
            },
            NotAttachedBackplate: {
                approvedFolders: {
                    'uplink.decoded': {
                        assignfunction: this.commonAssign,
                        common: {
                            role: 'indicator.maintenance',
                        },
                    },
                },
            },
        };
    }

    /*********************************************************************
     * ********************* Execution of Assigns  ***********************
     * ******************************************************************/

    /**
     * @param id id wich is assignable
     * @param value value of the assignable id
     * @param assigndata datastructure to assign
     * @param options options to assign (eg. common)
     */
    executeAssign(id, value, assigndata, options) {
        const activeFunction = 'executeAssign';
        this.adapter.log.debug(`Function ${activeFunction} started.`);
        try {
            // check folder
            const baseInfo = this.adapter.getBaseDeviceInfo(id);
            const subfolder = id.slice(
                baseInfo.objectStartDirectory.length + 1,
                id.length - baseInfo.changedState.length - 1,
            );
            if (assigndata.approvedFolders && assigndata.approvedFolders[subfolder]) {
                return assigndata.approvedFolders[subfolder].assignfunction(
                    id,
                    value,
                    assigndata.approvedFolders[subfolder],
                    options,
                );
            }
            return value;
        } catch (error) {
            this.adapter.log.error(`error at ${activeFunction}:  ${error}`);
        }
    }

    /*********************************************************************
     * ******************* Assign of common values ***********************
     * ******************************************************************/

    /**
     * @param id id wich is assignable
     * @param value value of the assignable id
     * @param assigndata datastructure to assign
     * @param options options to assign (eg. common)
     */
    commonAssign(id, value, assigndata, options) {
        for (const element in assigndata.common) {
            options.common[element] = assigndata.common[element];
        }
        return value;
    }
}

module.exports = assignhandlerClass;
