// Adapted from https://github.com/credomane/factoriomodsettings

import {ModeSettingsPropertyTypes} from "./ModeSettingsPropertyTypes";

export class DeserialiserError extends Error {}

export class ModSettingsDeserialiser {
  constructor(buffer) {
    this.buffer = buffer;
    this.dataView = new DataView(this.buffer);
    this.start = 0;
  }

  loadRaw(length) {
    const buffer = this.buffer.slice(this.start, this.start + length);
    if (buffer.length < length) {
      throw new DeserialiserError("Read past the end of buffer");
    }
    this.start += length;

    return buffer;
  }

  loadTyped(length, funcName, littleEndian) {
    const value = this.dataView[funcName](this.start, littleEndian);
    this.start += length;
    return value;
  }

  loadByte() {
    return this.loadTyped(1, "getUint8");
  }

  loadBool() {
    return !!this.loadByte();
  }

  loadUShort() {
    return this.loadTyped(2, "getUint16", true);
  }

  loadUInt() {
    return this.loadTyped(4, "getUint32", true);
  }

  loadULong() {
    return this.loadTyped(8, "getUint64", true);
  }

  loadDouble() {
    return this.loadTyped(8, "getFloat64", true);
  }

  loadString() {
    if (this.loadBool()) // true if empty
        return "";

    let stringSize = this.loadByte();
    if (stringSize === 255) {
      stringSize = this.loadUInt();
    }

    const buffer = this.loadRaw(stringSize);
    return new TextDecoder().decode(buffer);
  }

  loadPropertyTree() {
    const type = this.loadByte();
    this.loadBool(); // any-type flag

    switch (type) {
      case ModeSettingsPropertyTypes.none:
        return [type, null, null];
      case ModeSettingsPropertyTypes.boolean:
        return [type, null, this.loadBool()];
      case ModeSettingsPropertyTypes.number:
        return [type, null, this.loadDouble()];
      case ModeSettingsPropertyTypes.string:
        return [type, null, this.loadString()];
      case ModeSettingsPropertyTypes.list: {
        return this.loadPropertyList();
      }
      case ModeSettingsPropertyTypes.dictionary: {
        return this.loadPropertyDict();
      }
      default:
        throw new DeserialiserError("Unknown type: " + type);
    }
  }

  loadPropertyList() {
    const count = this.loadUInt();
    const types = [];
    const data = [];
    // Read list values
    for (let i = 0; i < count; ++i) {
      // List uses the same key <> value format as Dictionary but the key is unused
      this.loadString();
      const [itemType, itemTypeData, item] = this.loadPropertyTree();
      types.push([itemType, itemTypeData]);
      data.push(item);
    }

    return [ModeSettingsPropertyTypes.list, types, data];
  }

  loadPropertyDict() {
    const count = this.loadUInt();
    const types = {};
    const data = {};

    // Read dictionary values
    for (let i = 0; i < count; ++i) {
      const propName = this.loadString();
      const [itemType, itemTypeData, item] = this.loadPropertyTree();
      types[propName] = [itemType, itemTypeData];
      data[propName] = item;
    }

    return [ModeSettingsPropertyTypes.dictionary, types, data];
  }
}
