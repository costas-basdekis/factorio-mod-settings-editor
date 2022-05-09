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

class TabPanel extends Component {
  state = {
    originalSettings: this.props.tab.settings,
    settings: this.props.tab.settings,
    creatingDownload: false,
  };

  render() {
    const {modSettingsData, locale, tabIndex, selectedTabIndex} = this.props;
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
    const {codecErrors, modSettingsData, locale, loadModTranslations, tabs, selectedTabIndex} = this.state;

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
            Drop one or more mod-settings.dat files here, or 
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
            {tabs.map(tab => (
              <Tab 
                key={tab.id}
                label={tab.name || `File ${tab.id}`} 
                {...a11yProps(tab.id)}
              />
            ))}
          </Tabs>
        </Box>
        {tabs.map((tab, index) => (
          <TabPanel 
            key={tab.id}
            selectedTabIndex={selectedTabIndex} 
            tabIndex={index}
            tab={tab}
            registerTab={this.registerTab}
            unregisterTab={this.unregisterTab}
            modSettingsData={modSettingsData}
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

  onLoaderErrorClose = () => {
    this.setState({codecErrors: []});
  };

  onTabChange = (e, selectedTabIndex) => {
    this.setState({selectedTabIndex});
  };

  onTabClose = tab => {
    console.log(tab, this.state.tabs, this.state.tabs.filter(otherTab => otherTab !== tab))
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
    for (const file of files) {
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
      this.setState(({tabs}) => ({
        tabs: [...tabs, {
          id: tabs.length ? tabs.slice(-1)[0].id + 1 : 1,
          name: file.name,
          settings,
        }]
      }));
    }
    this.setState(({codecErrors}) => ({
      codecErrors: [...codecErrors, ...newCodecErrors],
    }));
  };
}
