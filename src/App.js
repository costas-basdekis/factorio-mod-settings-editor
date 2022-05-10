import { Component, createRef } from "react";
import "./styles.css";
import "./fileDrop.css";
import { FileDrop } from 'react-file-drop';
import {FactorioModSettings, DecoderError, EncoderError} from "./factorioModSettings";
import { SettingsEditor } from "./components";
import {Box, Button, InputLabel, Dialog, DialogContent, DialogTitle, DialogActions, MenuItem, Select, Tab, Tabs} from "@mui/material";

function a11yProps(index) {
  return {
    id: `simple-tab-${index}`,
    'aria-controls': `simple-tabpanel-${index}`,
  };
}

const REMEMBER_MOD_LIST_LOCAL_STORAGE_KEY = "factorioModSettingsEditor.rememberModList";
const getRememberModList = () => {
  if (localStorage.getItem(REMEMBER_MOD_LIST_LOCAL_STORAGE_KEY) === null) {
    setRememberModList(true);
    return true;
  }
  return JSON.parse(localStorage.getItem(REMEMBER_MOD_LIST_LOCAL_STORAGE_KEY));
};

const setRememberModList = (rememberSettings) => {
  localStorage.setItem(REMEMBER_MOD_LIST_LOCAL_STORAGE_KEY, JSON.stringify(rememberSettings));
};

const MOD_LIST_LOCAL_STORAGE_KEY = "factorioModSettingsEditor.modList";

const getModList = () => {
  if (localStorage.getItem(MOD_LIST_LOCAL_STORAGE_KEY) === null) {
    setModList(null);
    return null;
  }
  return JSON.parse(localStorage.getItem(MOD_LIST_LOCAL_STORAGE_KEY));
};

const setModList = modList => {
  localStorage.setItem(MOD_LIST_LOCAL_STORAGE_KEY, JSON.stringify(modList));
};

class MyMods extends Component {
  state = {
    rememberSettings: getRememberModList(),
    search: "",
  };

  render() {
    const {rememberSettings, search} = this.state;
    const {selectedTabIndex, tabIndex, modList, modSettingsData} = this.props;

    const allMods = modSettingsData ? Object.values(modSettingsData.mods) : [];
    let orderedMods = modList ? [
      ...allMods.filter(mod => modList.includes(mod.name)),
      ...((foundMods) => modList.filter(modName => !foundMods.includes(modName)).map(modName => ({name: modName, title: `${modName} - Unknown`})))(allMods.filter(mod => modList.includes(mod.name)).map(mod => mod.name)),
      ...allMods.filter(mod => !modList.includes(mod.name)),
    ] : allMods;
    if (search) {
      orderedMods = orderedMods.filter(mod => mod.name.toLowerCase().includes(search.toLowerCase()));
    }

    return (
      <div
        role={"tabpanel"}
        hidden={selectedTabIndex !== tabIndex}
        id={`simple-tabpanel-${tabIndex}`}
        aria-labelledby={`simple-tab-${tabIndex}`}
      >
        <label><input type={"checkbox"} checked={rememberSettings} onChange={this.onRememberSettingsChange} />Remember this list</label>
        {rememberSettings ? null : (
          <>
            {" "}
            <Button variant={"contained"} size={"small"} onClick={this.onSaveModList}>Save mod list</Button>
            <Button variant={"contained"} size={"small"} onClick={this.onLoadModList}>Load mod list</Button>
          </>
        )}
        <br/>
        <label><input type={"checkbox"} checked={modList === null} onChange={this.onShowAllMods} />Show all mods</label>
        <br/>
        {modList ? (
          <>
            <label>Search: <input type={"text"} value={search} onChange={this.onSearchChange} /></label>
            <br/>
            <ul>
              {orderedMods.map(mod => (
                <li key={mod.name}>
                  <label>
                    <input type={"checkbox"} checked={modList.includes(mod.name)} onChange={({target: {checked}}) => {
                      this.onModChange(mod, checked);
                    }}/>
                    {" "}{mod.title}
                  </label>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    );
  }

  onSaveModList = () => {
    setModList(this.props.modList);
  };

  onLoadModList = () => {
    this.props.onModListUpdate(getModList());
  };

  onRememberSettingsChange = ({target: {checked}}) => {
    setRememberModList(checked);
    this.setState({rememberSettings: checked});
  };

  onShowAllMods = ({target: {checked}}) => {
    if (checked) {
      this.props.onModListUpdate(null);
    } else {
      this.props.onModListUpdate([]);
    }
  };

  onModChange = (mod, checked) => {
    if (checked) {
      this.props.onModListUpdate([...this.props.modList, mod.name]);
    } else {
      this.props.onModListUpdate(this.props.modList.filter(modName => modName !== mod.name));
    }
  };

  onSearchChange = ({target: {value}}) => {
    this.setState({search: value});
  };
}

class TabPanel extends Component {
  state = {
    originalSettings: this.props.tab.settings,
    settings: this.props.tab.settings,
    creatingDownload: false,
  };

  render() {
    const {modSettingsData, locale, tabIndex, selectedTabIndex, modList} = this.props;
    const {originalSettings, settings, creatingDownload} = this.state;

    return (
      <div 
        role={"tabpanel"}
        hidden={selectedTabIndex !== tabIndex}
        id={`simple-tabpanel-${tabIndex}`}
        aria-labelledby={`simple-tab-${tabIndex}`}
      >
        <Button 
          disabled={!originalSettings || settings === originalSettings} 
          color={"warning"} 
          onClick={this.onReloadSettings}
        >
          {settings === originalSettings 
            ? "No changes to reset" 
            : "Reset"}
        </Button>
        <Button 
          disabled={!settings || creatingDownload || settings === originalSettings} 
          color={"primary"} 
          variant={"contained"} 
          onClick={this.onSaveSettings}
        >
          {creatingDownload 
            ? "Creating download..." 
            : settings === originalSettings 
              ? "No changes to download" 
              : "Download"}
        </Button>
        <Button color={"warning"} onClick={this.onClose}>Close</Button>
        <br/>
        <SettingsEditor 
          modSettingsData={modSettingsData}
          locale={locale}
          settings={settings}
          modList={modList}
          onChange={this.onSettingsChange} 
        />
      </div>
    );
  }

  onClose = () => {
    this.props.onClose(this.props.tab);
  }

  onSettingsChange = (newValue, path) => {
    this.setState(({settings}) => ({settings: settings.change(path, newValue)}));
  };

  onReloadSettings = () => {
    const {originalSettings} = this.state;
    if (!originalSettings) {
      return;
    }
    this.setState({settings: originalSettings});
  };

  onSaveSettings = () => {
    const {settings} = this.state;
    if (!settings) {
      return;
    }
    let buffer
    try {
      buffer = settings.toBuffer();
    } catch (e) {
      if (e instanceof EncoderError) {
        this.setState({codecError: e.message});
        return;
      }
      throw e;
    }
    this.downloadBlob(buffer, this.props.tab.name || "mod-settings.dat", "application/octet-stream");
  };

  downloadBlob(data, fileName, mimeType) {
    const blob = new Blob([data], {
      type: mimeType,
    });
  
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    try {
      a.click();
    } finally {
      a.remove();
    }
  
    setTimeout(() => window.URL.revokeObjectURL(url), 1000);
  }
}

export default class App extends Component {
  state = {
    codecErrors: [],
    modSettingsData: null,
    locale: "en",
    loadModTranslations: false,
    tabs: [
    ],
    selectedTabIndex: 0,
    modList: getRememberModList() ? getModList() : null,
  };

  fileInputRef = createRef();

  tabRefs = {};

  registerTab = (tab, ref) => {
    this.tabRefs[tab.id] = ref;
  };

  unregisterTab = tab => {
    delete this.tabRefs[tab.id];
  };

  async componentDidMount() {
    await this.loadCoreData(() => {
      if (this.state.loadModTranslations) {
        this.loadLocaleData(this.state.locale);
      }
      return null;
    });
  }

  async loadCoreData(callback) {
    const response = await fetch("https://costas-basdekis.github.io/factorio-mod-locale-parser/settings_data.json");
    const modSettingsData = await response.json();
    if (!modSettingsData.modLocales) {
      modSettingsData.modLocales = {};
    }
    this.setState({modSettingsData}, callback);
  }

  async loadLocaleData(locale) {
    if (this.state.modSettingsData.modLocales[locale]) {
      return;
    }
    const response = await fetch(`https://costas-basdekis.github.io/factorio-mod-locale-parser/mod_settings_data-${locale}.json`);
    const localeData = await response.json();
    this.setState(({modSettingsData}) => ({
      modSettingsData: {
        ...modSettingsData,
        modLocales: {
          ...modSettingsData.modLocales,
          [localeData.locale]: localeData,
        },
      },
    }));
  }

  render() {
    const {codecErrors, modSettingsData, locale, loadModTranslations, tabs, selectedTabIndex, modList} = this.state;

    return (
      <div className="App">
        <input
          onChange={this.onFileInputChange}
          ref={this.fileInputRef}
          type={"file"}
          className={"hidden"}
        />
        <div className={"file-drop-container"}>
          <FileDrop
            onDrop={this.onFileDrop}
            onTargetClick={this.onTargetClick}
          >
            Drop one or more mod-settings.dat or mod-list.json files here, or
            <Button color={"primary"} variant={"contained"}>pick a file</Button>
          </FileDrop>
        </div>
        <InputLabel id={"locale-select-label"} sx={{display: "inline"}}>Locale</InputLabel>
        <Select
          labelId={"locale-select-label"}
          id={"locale-select"}
          value={locale}
          label={"Locale"}
          onChange={this.onLocaleChange}
          size={"small"}
        >
          {(modSettingsData?.locales ?? ["en"]).map(locale => (
            <MenuItem key={locale} value={locale}>{locale}</MenuItem>
          ))}
        </Select>
        <label><input type={"checkbox"} checked={loadModTranslations} onChange={this.onLoadModTranslationsChange} />Load mod translations</label>
        <br/>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={selectedTabIndex} onChange={this.onTabChange} aria-label={"basic tabs example"}>
            <Tab
              key={"modList"}
              label={"Your mods"}
              {...a11yProps(0)}
            />
            {tabs.map((tab, index) => (
              <Tab 
                key={tab.id}
                label={tab.name || `File ${tab.id}`} 
                {...a11yProps(index + 1)}
              />
            ))}
          </Tabs>
        </Box>
        <MyMods
          key={"my-mods"}
          selectedTabIndex={selectedTabIndex}
          tabIndex={0}
          modSettingsData={modSettingsData}
          modList={modList}
          onModListUpdate={this.onModListUpdate}
        />
        {tabs.map((tab, index) => (
          <TabPanel 
            key={tab.id}
            selectedTabIndex={selectedTabIndex} 
            tabIndex={index + 1}
            tab={tab}
            registerTab={this.registerTab}
            unregisterTab={this.unregisterTab}
            modSettingsData={modSettingsData}
            modList={modList}
            locale={locale}
            onPickFile={this.onTargetClick}
            onClose={this.onTabClose}
          />
        ))}
        <Dialog
          open={codecErrors.length > 0}
          onClose={this.onLoaderErrorClose}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
        >
          <DialogTitle>There were some errors with the file(s)</DialogTitle>
          <DialogContent id="alert-dialog-title">
            <ul>
              {codecErrors.map(({fileName, message}, index) => (
                <li key={index}>{fileName}: {message}</li>
              ))}
            </ul>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.onLoaderErrorClose} autoFocus>
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }

  onModListUpdate = modList => {
    if (getRememberModList()) {
      setModList(modList);
    }
    this.setState({modList});
  };

  onLoaderErrorClose = () => {
    this.setState({codecErrors: []});
  };

  onTabChange = (e, selectedTabIndex) => {
    this.setState({selectedTabIndex});
  };

  onTabClose = tab => {
    this.setState(({tabs, selectedTabIndex}) => {
      if (!tabs.includes(tab)) {
        return null;
      }
      const oldIndex = tabs.indexOf(tab);
      const newTabs = tabs.filter(otherTab => otherTab !== tab);
      return {
        tabs: newTabs,
        selectedTabIndex: oldIndex >= newTabs.length ? newTabs.length - 1 : selectedTabIndex,
      };
    });
  };

  onLocaleChange = ({target: {value}}) => {
    this.setState({locale: value});
    if (this.state.loadModTranslations) {
      this.loadLocaleData(value);
    }
  };

  onLoadModTranslationsChange = ({target: {checked}}) => {
    this.setState({loadModTranslations: checked}, () => {
      if (this.state.loadModTranslations) {
        this.loadLocaleData(this.state.locale);
      }
    });
  }

  onTargetClick = () => {
    this.fileInputRef.current?.click();
  };  

  onFileInputChange = ({target: {files}}) => {
    this.onFileDrop(files);
  };

  onFileDrop = async files => {
    const newCodecErrors = [];
    let selectedTabIndex = null;
    const setSelectedTabIndex = newValue => {
      if (selectedTabIndex === null) {
        selectedTabIndex = newValue;
      }
    };

    for (const file of files) {
      if (file.name.endsWith(".json") && file.name.includes("mod-list")) {
        let modListData;
        try {
          const text = await file.text();
          modListData = JSON.parse(text);
        } catch (e) {
          newCodecErrors.push({fileName: file.name, message: `Could not load mod list file (${e.message})`});
          continue;
        }
        if (!modListData || !Array.isArray(modListData.mods)) {
          newCodecErrors.push({fileName: file.name, message: `Mod list file did not have the expected format`});
          continue;
        }
        const modList = modListData.mods.map(item => item?.name).filter(name => name);
        this.onModListUpdate(modList);
        continue;
      }
      const fileBuffer = await file.arrayBuffer();
      let settings;
      try {
        settings = FactorioModSettings.fromBuffer(fileBuffer);
      } catch (e) {
        if (e instanceof DecoderError) {
          newCodecErrors.push({fileName: file.name, message: e.message});
        } else {
          newCodecErrors.push({fileName: file.name, message: `Encountered an unexpected error (${e.message})`});
        }
        continue;
      }
      this.setState(({tabs}) => {
        const newTabs = [
          ...tabs,
          {
            id: tabs.length ? tabs.slice(-1)[0].id + 1 : 1,
            name: file.name,
            settings,
          },
        ];
        // The index of the new last item, +1 because of the mods list editor
        setSelectedTabIndex(newTabs.length - 1 + 1);
        return {
          tabs: newTabs,
        };
      });
    }
    if (newCodecErrors.length) {
      this.setState(({codecErrors}) => {
        return {
          codecErrors: [...codecErrors, ...newCodecErrors],
        };
      });
    }
    this.setState(() => {
      if (selectedTabIndex === null) {
        return null;
      }
      return {selectedTabIndex};
    });
  };
}
