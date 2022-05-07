// Adapted from https://github.com/credomane/factoriomodsettings

import {ModeSettingsPropertyTypes} from "./ModeSettingsPropertyTypes";
import {Buffer} from 'buffer';

export class SerialiserError extends Error {}

export class ModSettingsSerialiser {
  constructor() {
    this.buffer = Buffer.alloc(0);
  }

  saveRaw(value) {
    this.buffer = Buffer.concat([this.buffer, value], this.buffer.length + value.length);
  }

  saveByte(value) {
    let buf = Buffer.alloc(1);
    buf.writeUInt8(value);
    this.saveRaw(buf);
  }

  saveBool(value) {
    let buf = Buffer.alloc(1);
    //Gotta do this otherwise it always writes 1 now matter if value is true or false.
    //value = (!!value) ? 1 : 0;
    buf.writeUInt8(value);
    this.saveRaw(buf);
  }

  saveUShort(value) {
    let buf = Buffer.alloc(2);
    buf.writeUInt16LE(value);
    this.saveRaw(buf);
  }

  saveUInt(value) {
    let buf = Buffer.alloc(4);
    buf.writeUInt16LE(value);
    this.saveRaw(buf);
  }

  saveULong(value) {
    let buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(value);
    this.saveRaw(buf);
  }

  saveDouble(value) {
    let buf = Buffer.alloc(8);
    buf.writeDoubleLE(value);
    this.saveRaw(buf);
  }

  saveString(value) {
    /*
    //According to Rseding91's sample code this is how this is suppose to work...
    this.saveBool(value.length === 0);
    if (value.length === 0) {
      return;
    }
    */
    //...but it is always false in practice.
    this.saveBool(false);

    let buf = Buffer.from(value);

    if (buf.length < 255) {
      this.saveByte(buf.length);
    } else {
      this.saveByte(255);
      this.saveUInt(buf.length);
    }
    this.saveRaw(buf);
  }

  savePropertyTree(tree) {
    let type = typeof (tree);
    // Type
    this.saveByte(ModeSettingsPropertyTypes[type]);
    // Any-type flag
    //According to rseding91's sample code this is how the any-flag works but in reality it is always false..
    //this.saveBool(ModeSettingsPropertyTypes[type] === ModeSettingsPropertyTypes.string);
    this.saveBool(false);

    let count;

    switch (ModeSettingsPropertyTypes[type]) {
      case ModeSettingsPropertyTypes.none:
        break;
      case ModeSettingsPropertyTypes.boolean:
        this.saveBool(tree);
        break;
      case ModeSettingsPropertyTypes.number:
        this.saveDouble(tree);
        break;
      case ModeSettingsPropertyTypes.string:
        this.saveString(tree);
        break;
      case ModeSettingsPropertyTypes.list:
        count = tree.length;
        this.saveUInt(count);
        // Save list values
        tree.forEach(function (value) {
          // List uses the same key <> value format as Dictionary but the key is unused
          this.saveString("");
          this.savePropertyTree(tree[value]);
        }.bind(this));
        break;
      case ModeSettingsPropertyTypes.dictionary:
        count = Object.keys(tree).length;
        this.saveUInt(count);

        // Save dictionary values
        Object.keys(tree).forEach(function (value) {
          this.saveString(value);
          this.savePropertyTree(tree[value]);
        }.bind(this));

        break;
      default:
        throw new SerialiserError("Unknown type: " + type);
    }
  }
}
