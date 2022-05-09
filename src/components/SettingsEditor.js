import { Component } from "react";
import { StructureEditor } from "./StructureEditor";
import {TreeItem, TreeView} from '@mui/lab';
import AddBoxIcon from '@mui/icons-material/AddBox';
import IndeterminateCheckBoxIcon from '@mui/icons-material/IndeterminateCheckBox';
import { translateCoreText } from "../localeUtils";

export class SettingsEditor extends Component {
  render() {
    const {modSettingsData, locale, settings, modList} = this.props;
    return (
      <>
        <TreeView
          aria-label="file system navigator"
          defaultCollapseIcon={<IndeterminateCheckBoxIcon />}
          defaultExpandIcon={<AddBoxIcon />}
          defaultExpanded={["game", "mod-settings"]}
          sx={{ flexGrow: 1, overflowX: "none" }}
        >
          <TreeItem nodeId={"game"} label={"Factorio"}>
            <TreeItem nodeId={"version"} label={`${translateCoreText("version", modSettingsData, locale)} ${settings.versionStr}`} />
            <TreeItem nodeId={"mod-settings"} label={translateCoreText("mod-settings", modSettingsData, locale)}>
              <StructureEditor 
                modSettingsData={modSettingsData}
                locale={locale}
                value={settings.settings}
                typeAndData={settings.typeAndData}
                path={[]}
                modList={modList}
                onChange={this.props.onChange}
              />
            </TreeItem>
          </TreeItem>
        </TreeView>
      </>
    );
  }
}
