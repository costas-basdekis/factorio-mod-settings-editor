// Adapted from https://github.com/credomane/factoriomodsettings

import {ModSettingsDeserialiser, DeserialiserError} from "./ModSettingsDeserialiser";
import {ModSettingsSerialiser, SerialiserError} from "./ModSettingsSerialiser";

export class DecoderError extends Error {}
export class CodecMismatchError extends DecoderError {}
export class EncoderError extends Error {}

export class FactorioModSettings {
  static fromBuffer(buffer, checkDecoderFidelity = true) {
    if (checkDecoderFidelity) {
      if (!this.checkDecoderFidelity(buffer)) {
        throw new CodecMismatchError(`Encoder had differences from original - this editor has a bug, and cannot safely make changes`);
      }
    }
    const deserialiser = new ModSettingsDeserialiser(buffer);

    let version, type, typeData, settings;
    try {
      version = {
        main: deserialiser.loadUShort(),
        major: deserialiser.loadUShort(),
        minor: deserialiser.loadUShort(),
        revision: deserialiser.loadUShort(),
      };
    
      //Handle the extra boolean added in Factorio 0.17.0
      if (version.main >= 1 || (version.main === 0 && version.major === 17)) {
        version.unknownBooleanAfterVersionInfo = deserialiser.loadBool();
      } else {
        version.unknownBooleanAfterVersionInfo = false;
      }
    
      [type, typeData, settings] = deserialiser.loadPropertyTree();
    } catch (e) {
      if (e.constructor === DeserialiserError) {
        throw new DecoderError(`Could not decode file (${e.message})`);
      }
      throw e;
    }
    return new this(version, settings, [type, typeData]);
  }

  static checkDecoderFidelity(buffer) {
    const settings = this.fromBuffer(buffer, false);
    const resultBuffer = settings.toBuffer();
    if (buffer.byteLength !== resultBuffer.byteLength) {
      return false;
    }
    const bufferDV = new DataView(buffer), resultBufferDV = new DataView(resultBuffer);
    for (let i = 0 ; i < buffer.byteLength ; i++) {
      if (bufferDV.getUint8(i) !== resultBufferDV.getUint8(i)) {
        return false;
      }
    }

    return true;
  }

  constructor(version, settings, typeAndData) {
    this.version = version;
    this.settings = settings;
    this.typeAndData = typeAndData;
  }

  get versionStr() {
    const {main, major, minor, revision} = this.version;
    return `v${main}.${major}.${minor}.${revision}`;
  }

  change(path, newValue) {
    return new FactorioModSettings(this.version, this.changePath(this.settings, path, newValue), this.typeAndData);
  }

  changePath(structure, path, newValue) {
    if (Array.isArray(structure)) {
      if (!path.length) {
        throw new Error("Cannot change list, since path was empty");
      } else if (typeof path[0] !== typeof 0) {
        throw new Error("Cannot change list, since next path item was not a number");
      } else if (structure[path[0]] === undefined) {
        throw new Error("Cannot change list, since next path item was out of bounds");
      }
      return [...structure.slice(0, path[0]), this.changePath(structure[path[0]], path.slice(1), newValue), ...structure.slice(path[0] + 1)];
    } else if (typeof structure === typeof {}) {
      if (!path.length) {
        throw new Error("Cannot change dictionary, since path was empty");
      } else if (structure[path[0]] === undefined) {
        throw new Error("Cannot change dictionary, since next path item was not found");
      }
      return {...structure, [path[0]]: this.changePath(structure[path[0]], path.slice(1), newValue)};
    } else {
      if (path.length) {
        throw new Error("Cannot change value, since path was not empty");
      } else if (typeof structure !== typeof newValue) {
        throw new Error("Cannot change value since new value was of different type");
      }

      return newValue;
    }
  }
  
  toBuffer() {
    let serialiser;
    try {
      serialiser = new ModSettingsSerialiser();
    
      serialiser.saveUShort(this.version.main);
      serialiser.saveUShort(this.version.major);
      serialiser.saveUShort(this.version.minor);
      serialiser.saveUShort(this.version.revision);
    
      //Handle the extra boolean added in Factorio 0.17.0
      if (this.version.main >= 1 || (this.version.main === 0 && this.version.major === 17)) {
        serialiser.saveBool(this.version.unknownBooleanAfterVersionInfo);
      }
    
      serialiser.savePropertyTree(this.settings);
    } catch (e) {
      if (e instanceof SerialiserError) {
        throw new EncoderError(`Could not encode file (${e.message})`);
      }
      throw e;
    }

    return new Uint8Array(serialiser.buffer).buffer;
  }
}
