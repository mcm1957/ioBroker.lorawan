# 📘 Kurz-Dokumentation: LoRaWAN + Type-Detector Integration in ioBroker

## 🎯 Ziel
Automatische Erkennung und Klassifizierung von LoRaWAN-Geräten in ioBroker – ohne manuelle Konfiguration.

---

## 📡 `assign_table.md`  
Definiert, wie LoRaWAN-Payloads (z. B. `temperature`, `battery`) in ioBroker-Datenpunkte übersetzt werden.  
Jeder Eintrag enthält:
- `state name`  
- `common.role` (z. B. `value.temperature`)  
- `type`, `unit`, `read`, `write`, `min`, `max` usw.

➡ Diese Metadaten werden **vom Adapter beim Anlegen der States verwendet**.

---

## 🧠 `type-detector` (`DEVICES.md`)  
Erkennt anhand von States und deren Metadaten den Gerätekontext (z. B. Temperaturfühler, GPS-Tracker).  
Verwendet u. a.:
- `role`, `unit`, `type`, `read/write`, Min/Max
- logische Zuordnungen zu bekannten Gerätetypen

➡ Automatische Strukturierung von Geräten für Visualisierung und Integration (z. B. Material UI, HomeKit).

---

## 🔗 Zusammenspiel

1. LoRaWAN-Payload wird empfangen.
2. `assign_table.md` definiert die resultierenden ioBroker-Datenpunkte mit passenden Metadaten.
3. `type-detector` analysiert die States und erkennt automatisch den passenden Gerätetyp.
4. Das Gerät erscheint korrekt klassifiziert im Objektbaum – bereit für Visualisierung, Automatisierung und Sprachsteuerung.

---

## 📝 Beispiel

| Payload-Feld     | ioBroker-Objekt         | Rolle              | Erkanntes Gerät        |
|------------------|--------------------------|---------------------|-------------------------|
| `temperature`     | `sensor.0.temp1`         | `value.temperature` | Temperatur-Sensor       |
| `batteryLevel`    | `sensor.0.battery`       | `value.battery`     | Akku-Sensor (intern)    |

---

## ✅ Vorteile

- Kein manuelles Geräte-Mapping nötig  
- Kompatibel mit ioBroker-Standards (`role`, `type`, etc.)  
- Grundlage für automatisches Hinzufügen in Öko-Systemen über die Matter Bridge
