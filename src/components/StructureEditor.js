import { Component } from "react";
import {ModeSettingsPropertyTypes} from "../factorioModSettings";
import {TreeItem} from '@mui/lab';
import { translateCoreText, translateModDescription, translateModText } from "../localeUtils";
import { Tooltip } from "@mui/material";
import InfoIcon from '@mui/icons-material/Info';

export class StructureEditor extends Component {
  static for(key, mod, props) {
    const [type] = props.typeAndData;
    switch (type) {
      case ModeSettingsPropertyTypes.string:
        return StringEditor.for(key, mod, props);
      case ModeSettingsPropertyTypes.number:
        return NumberEditor.for(key, mod, props);
      case ModeSettingsPropertyTypes.boolean:
        return BooleanEditor.for(key, mod, props);
      case ModeSettingsPropertyTypes.none:
        return NoneEditor.for(key, mod, props);
      case ModeSettingsPropertyTypes.list:
        return ListEditor.for(key, mod, props);
      case ModeSettingsPropertyTypes.dictionary:
          return DictionaryEditor.for(key, mod, props);
      default:
        throw new Error(`Unknow type: ${type}`);
    }
  }

  render() {
    const [type] = this.props.typeAndData;
    switch (type) {
      case ModeSettingsPropertyTypes.string:
        return <StringEditor {...this.props} />;
      case ModeSettingsPropertyTypes.number:
        return <NumberEditor {...this.props} />;
      case ModeSettingsPropertyTypes.boolean:
        return <BooleanEditor {...this.props} />;
      case ModeSettingsPropertyTypes.none:
        return <NoneEditor {...this.props} />;
      case ModeSettingsPropertyTypes.list:
        return <ListEditor {...this.props} />;
      case ModeSettingsPropertyTypes.dictionary:
          return <DictionaryEditor {...this.props} />;
      default:
        throw new Error(`Unknow type: ${type}`);
    }
  }
}

class ValueEditor extends Component {
  static for(key, mod, props) {
    const Editor = this;
    let label = <Editor {...props} />;
    if (key) {
      const title = translateModText(key, mod, props.modSettingsData, props.locale);
      const description = translateModDescription(key, mod, props.modSettingsData, props.locale);
      label = (
        <>
          {title}
          {description ? (
            <Tooltip title={description}>
              <InfoIcon fontSize={"small"}/>
            </Tooltip>
          ) : null}
          : {label}
        </>
      );
    }
    return <TreeItem nodeId={`settings.${props.path.join("|")}`} key={key} label={label} />;
  }
}

class StringEditor extends ValueEditor {
  render() {
    const {value, typeAndData, editable = true, path = null} = this.props;
    const [type] = typeAndData;
    if (typeof value !== typeof "") {
      throw new Error("Expected string value");
    }
    if (type !== ModeSettingsPropertyTypes.string) {
      throw new Error(`Got string but type was: ${type}`);
    }
    if (!editable) {
      return `${value}`;
    }
    if (!path) {
      throw new Error("No path was provided for editable value");
    }
    return (
      <input type={"text"} value={value} onChange={this.onChange} />
    );
  }

  onChange = ({target: {value: newValue}}) => {
    this.props.onChange(newValue, this.props.path);
  };
}

class NumberEditor extends ValueEditor {
  render() {
    const {value, typeAndData, editable = true, path = null} = this.props;
    const [type] = typeAndData;
    if (typeof value !== typeof 0) {
      throw new Error("Expected number value");
    }
    if (type !== ModeSettingsPropertyTypes.number) {
      throw new Error(`Got number but type was: ${type}`);
    }
    if (!editable) {
      return `${value}`;
    }
    if (!path) {
      throw new Error("No path was provided for editable value");
    }
    return (
      <input type={"number"} value={value} onChange={this.onChange} />
    );
  }

  onChange = ({target: {value}}) => {
    this.props.onChange(parseInt(value, 10), this.props.path);
  };
}

class BooleanEditor extends ValueEditor {
  render() {
    const {value, typeAndData, editable = true, path = null} = this.props;
    const [type] = typeAndData;
    if (typeof value !== typeof true) {
      throw new Error("Expected boolean value");
    }
    if (type !== ModeSettingsPropertyTypes.boolean) {
      throw new Error(`Got boolean but type was: ${type}`);
    }
    if (!editable) {
      return `${value}`;
    }
    if (!path) {
      throw new Error("No path was provided for editable value");
    }
    return (
      <input type={"checkbox"} checked={value} onChange={this.onChange} />
    );
  }

  onChange = ({target: {checked: newValue}}) => {
    this.props.onChange(newValue, this.props.path);
  };
}

class NoneEditor extends ValueEditor {
  render() {
    const {value, typeAndData, editable = true, path = null} = this.props;
    const [type] = typeAndData;
    if (value !== null) {
      throw new Error("Expected null value");
    }
    if (type !== ModeSettingsPropertyTypes.none) {
      throw new Error(`Got null but type was: ${type}`);
    }
    if (!editable) {
      return `${value}`;
    }
    if (path) {
      throw new Error("No path was provided for editable value");
    }
    return `${value}`;
  }
}

class ListEditor extends Component {
  static for(key, mod, props) {
    if (key) {
      return (
        <TreeItem nodeId={`settings.${props.path.join("|")}`} key={key} label={key}>
          <ListEditor {...props} />
        </TreeItem>
      );
    }
    return <ListEditor {...props} />;
  }

  render() {
    const {modSettingsData, locale, value, typeAndData, editable = true, path = null} = this.props;
    const [type, typeData] = typeAndData;
    if (!Array.isArray(value)) {
      throw new Error("Expected list value");
    }
    if (type !== ModeSettingsPropertyTypes.list) {
      throw new Error(`Got list but type was: ${type}`);
    }
    return value.map((item, index) => (
      StructureEditor.for(index, null, {
        modSettingsData,
        locale,
        value: item,
        typeData: typeData[index],
        editable: editable,
        path: path ? [...path, index] : null,
        onChange: this.props.onChange,
      })
    ));
  }
}

class DictionaryEditor extends Component {
  static for(key, mod, props) {
    if (key) {
      const entries = Array.from(Object.entries(props.value));
      if (!props.noModSplit && props.modSettingsData && ["startup", "runtime-global", "runtime-per-user"].includes(key)) {
        const names = entries.map(([subKey]) => subKey);
        const mods = Array.from(Object.values(props.modSettingsData.mods))
          .filter(mod => names.some(name => mod.setting_names.includes(name.toLowerCase())));
        const noModNames = names.filter(name => !mods.some(mod => mod.setting_names.includes(name.toLowerCase())));
        const userMods = props.modList ? mods.filter(mod => props.modList.includes(mod.name)) : mods;
        const treeItems = userMods.map(mod => (
          <TreeItem key={mod.name} nodeId={`mod-${mod.name}`} label={mod.title}>
            <DictionaryEditor {...{
              ...props,
              mod: mod.name,
              value: Object.fromEntries(names.filter(name => mod.setting_names.includes(name.toLowerCase())).map(name => [name, props.value[name]])),
            }} />
          </TreeItem>
        ));
        if (noModNames.length) {
          treeItems.push((
            <DictionaryEditor key={"rest"} {...{
              ...props,
              value: Object.fromEntries(names.filter(name => noModNames.includes(name)).map(name => [name, props.value[name]])),
            }} />
          ))
        }
        return (
          <TreeItem nodeId={`settings.${props.path.join("|")}`} key={key} label={translateCoreText(key, props.modSettingsData, props.locale)}>
            {treeItems}
          </TreeItem>
        );
      }
      if (entries.length === 1 && entries[0][0] === "value") {
        const {modSettingsData, locale, typeAndData, editable = true, path = null} = props;
        const [, typeData] = typeAndData;
        const [[subKey, item]] = entries;
        return (
          StructureEditor.for(key, props.mod, {
            modSettingsData,
            locale,
            value: item,
            typeAndData: typeData[subKey],
            modList: props.modList,
            editable,
            path: path ? [...path, subKey] : null,
            onChange: props.onChange,
          })
        );
      }
      return (
        <TreeItem nodeId={`settings.${props.path.join("|")}`} key={key} label={key}>
          <DictionaryEditor {...props} />
        </TreeItem>
      );
    }
    return <DictionaryEditor {...props} />;
  }

  render() {
    const {modSettingsData, mod, locale, value, typeAndData, editable = true, path = null, modList} = this.props;
    const [type, typeData] = typeAndData;
    if (typeof value !== typeof {}) {
      throw new Error("Expected dictionary value");
    }
    if (type !== ModeSettingsPropertyTypes.dictionary) {
      throw new Error(`Got dictionary but type was: ${type}`);
    }
    const entries = Object.entries(value);
    return entries.map(([key, item]) => (
      StructureEditor.for(key, mod, {
        modSettingsData,
        mod,
        locale,
        value: item,
        typeAndData: typeData[key],
        modList: modList,
        editable,
        path: path ? [...path, key] : null,
        onChange: this.props.onChange,
      })
    ));
  }
}
