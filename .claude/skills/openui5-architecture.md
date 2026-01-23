# OpenUI5 + FCL Architecture Skills

## Overview

This skill provides comprehensive architectural guidelines for building OpenUI5 applications with Flexible Column Layout (FCL) in the ERDwithAI project. This guide follows the latest OpenUI5 1.120+ standards and is designed for the Bun.js runtime.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Application Architecture](#application-architecture)
3. [Flexible Column Layout (FCL)](#flexible-column-layout-fcl)
4. [Component Architecture](#component-architecture)
5. [Controller Patterns](#controller-patterns)
6. [Fragment Reuse](#fragment-reuse)
7. [Data Binding](#data-binding)
8. [OData Integration](#odata-integration)
9. [Routing and Navigation](#routing-and-navigation)
10. [Model-View-Controller (MVC)](#model-view-controller-mvc)
11. [UI5 Modernization](#ui5-modernization)
12. [Performance Optimization](#performance-optimization)
13. [Bun.js Runtime Specifics](#bunjs-runtime-specifics)

---

## Project Structure

### Standard OpenUI5 Project Structure

```
packages/openui5-app/
├── webapp/
│   ├── index.html                  # Application entry point
│   ├── Component.js                # Root component
│   ├── manifest.json               # Application descriptor
│   ├── config/
│   │   └── config.js               # Configuration files
│   ├── css/
│   │   └── style.css               # Custom styles
│   ├── i18n/
│   │   ├── i18n.properties         # Default translations
│   │   ├── i18n_en.properties      # English
│   │   └── i18n_de.properties      # German
│   ├── model/
│   │   ├── models.js               # JSON models
│   │   ├── models.xml              # OData models
│   │   └── formatter.js            # Data formatters
│   ├── controller/
│   │   ├── App.controller.js       # Root controller
│   │   ├── BaseController.js       # Base controller class
│   │   ├── Master/
│   │   │   └── Master.controller.js
│   │   ├── Detail/
│   │   │   └── Detail.controller.js
│   │   └── fragments/
│   │       └── FragmentController.js
│   ├── view/
│   │   ├── App.view.xml            # Root view
│   │   ├── Master/
│   │   │   └── Master.view.xml
│   │   ├── Detail/
│   │   │   ├── Detail.view.xml
│   │   │   └── DetailObject.page.xml
│   │   └── fragments/
│   │       ├── dialogs.xml
│   │       └── popovers.xml
│   ├── localService/
│   │   └── mockdata.json           # Mock data for testing
│   ├── test/
│   │   ├── unit/
│   │   │   └── controller/
│   │   │       └── App.controller.js
│   │   └── OPA5/
│   │       ├── AllJourney.js
│   │       ├── MasterJourney.js
│   │       └── NavigationJourney.js
│   └── test.html                   # Test page
├── ui5.yaml                        # UI5 tooling configuration
├── package.json
└── tsconfig.json
```

### Key Architecture Principles

1. **Component-Based**: Reusable UI components
2. **Declarative UI**: XML views for structure
3. **Data Binding**: Automatic view-model synchronization
4. **Responsive Design**: FCL for adaptive layouts
5. **Model-View-Controller**: Clear separation of concerns

---

## Application Architecture

### Component.js - Root Component

```javascript
// webapp/Component.js
sap.ui.define([
  "sap/ui/core/UIComponent",
  "sap/ui/Device",
  "com/erdwithai/model/models"
], function(UIComponent, Device, Models) {
  "use strict";

  return UIComponent.extend("com.erdwithai.Component", {

    metadata: {
      manifest: "json"
    },

    init: function() {
      // Call the base component's init function
      UIComponent.prototype.init.apply(this, arguments);

      // Enable routing
      this.getRouter().initialize();

      // Set the device model
      this.setModel(Models.createDeviceModel(), "device");

      // Set the OData model
      this.setModel(Models.createODataModel(), "odata");

      // Set the i18n model
      this.setModel(Models.createResourceModel(), "i18n");
    },

    destroy: function() {
      // Call the base component's destroy function
      UIComponent.prototype.destroy.apply(this, arguments);
    },

    getContentDensityClass: function() {
      if (!this._sContentDensityClass) {
        if (!sap.ui.Device.support.touch) {
          this._sContentDensityClass = "sapUiSizeCompact";
        } else {
          this._sContentDensityClass = "sapUiSizeCozy";
        }
      }
      return this._sContentDensityClass;
    }
  });
});
```

### manifest.json - Application Descriptor

```json
{
  "_version": "1.60.0",
  "sap.app": {
    "id": "com.erdwithai",
    "type": "application",
    "i18n": "i18n/i18n.properties",
    "title": "{{appTitle}}",
    "description": "{{appDescription}}",
    "applicationVersion": {
      "version": "1.0.0"
    },
    "dataSources": {
      "mainService": {
        "uri": "/api/odata/",
        "type": "OData",
        "settings": {
          "odataVersion": "4.0",
          "localUri": "localService/metadata.xml"
        }
      }
    },
    "crossNavigation": {
      "inbounds": {
        "projects": {
          "semanticObject": "project",
          "action": "display",
          "title": "{{projectDisplayTitle}}",
          "signature": {
            "parameters": {}
          }
        }
      }
    }
  },
  "sap.ui": {
    "technology": "UI5",
    "icons": {
      "icon": "",
      "favIcon": ""
    },
    "deviceTypes": {
      "desktop": true,
      "tablet": true,
      "phone": true
    },
    "fullWidth": true
  },
  "sap.ui5": {
    "rootView": {
      "viewName": "com.erdwithai.view.App",
      "type": "XML",
      "id": "app"
    },
    "dependencies": {
      "minUI5Version": "1.120.0",
      "libs": {
        "sap.m": {},
        "sap.f": {},
        "sap.ui.core": {},
        "sap.ui.table": {}
      }
    },
    "models": {
      "i18n": {
        "type": "sap.ui.model.resource.ResourceModel",
        "settings": {
          "bundleName": "com.erdwithai.i18n.i18n"
        }
      },
      "odata": {
        "dataSource": "mainService",
        "settings": {
          "defaultOperationMode": "Server",
          "defaultBindingMode": "TwoWay",
          "defaultUpdateMethod": "MERGE",
          "useBatch": true
        }
      },
      "device": {
        "type": "sap.ui.model.json.JSONModel",
        "settings": {}
      }
    },
    "routing": {
      "config": {
        "routerClass": "sap.f.routing.Router",
        "viewType": "XML",
        "viewPath": "com.erdwithai.view",
        "controlId": "fcl",
        "controlAggregation": "beginColumnPages",
        "transition": "slide",
        "bypassed": {
          "target": ["notFound"]
        },
        "async": true
      },
      "routes": [
        {
          "pattern": "",
          "name": "master",
          "target": ["master", "detail"]
        },
        {
          "pattern": "projects/{projectId}",
          "name": "project",
          "target": ["master", "detail"]
        },
        {
          "pattern": "projects/{projectId}/entities/{entityId}",
          "name": "entity",
          "target": ["master", "detail", "detailDetail"]
        }
      ],
      "targets": {
        "master": {
          "viewName": "Master",
          "viewLevel": 1,
          "controlAggregation": "beginColumnPages"
        },
        "detail": {
          "viewName": "Detail",
          "viewLevel": 2,
          "controlAggregation": "midColumnPages"
        },
        "detailDetail": {
          "viewName": "DetailDetail",
          "viewLevel": 3,
          "controlAggregation": "endColumnPages"
        },
        "notFound": {
          "viewName": "NotFound",
          "viewLevel": 99
        }
      }
    }
  }
}
```

---

## Flexible Column Layout (FCL)

### FCL Configuration in App.view.xml

```xml
<!-- webapp/view/App.view.xml -->
<mvc:View
  controllerName="com.erdwithai.controller.App"
  xmlns:mvc="sap.ui.core.mvc"
  displayBlock="true"
  xmlns="sap.m">
  <App id="app">
    <f:FlexibleColumnLayout
      id="fcl"
      backgroundDesign="Solid"
      layout="{device>/layout}"
      xmlns:f="sap.f">
    </f:FlexibleColumnLayout>
  </App>
</mvc:View>
```

### App.controller.js - FCL Layout Management

```javascript
// webapp/controller/App.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/f/FlexibleColumnLayoutSemanticHelper",
  "sap/f/library"
], function(Controller, JSONModel, FlexibleColumnLayoutSemanticHelper, fLibrary) {
  "use strict";

  return Controller.extend("com.erdwithai.controller.App", {

    onInit: function() {
      // Initialize device model
      this._setupDeviceModel();
    },

    _setupDeviceModel: function() {
      var oDeviceModel = new JSONModel({
        isTouch: sap.ui.Device.support.touch,
        isNoTouch: !sap.ui.Device.support.touch,
        isPhone: sap.ui.Device.system.phone,
        isDesktop: sap.ui.Device.system.desktop,
        layout: this._getInitialLayout()
      });
      oDeviceModel.setDefaultBindingMode("OneWay");
      this.getView().setModel(oDeviceModel, "device");
    },

    _getInitialLayout: function() {
      return sap.ui.Device.system.phone ? fLibrary.LayoutType.OneColumn : fLibrary.LayoutType.TwoColumnsBeginExpanded;
    }
  });
});
```

### Master View with FCL Navigation

```xml
<!-- webapp/view/Master/Master.view.xml -->
<mvc:View
  controllerName="com.erdwithai.controller.Master"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:f="sap.f">
  <f:DynamicPage
    id="dynamicPage"
    headerExpanded="{/headerExpanded}"
    title="{i18n>masterTitle}">
    <f:headerContent>
      <f:DynamicPageHeader>
        <Bar>
          <contentMiddle>
            <SearchField
              id="searchField"
              placeholder="{i18n>searchPlaceholder}"
              search="onSearch"
              width="100%"/>
          </contentMiddle>
        </Bar>
      </f:DynamicPageHeader>
    </f:headerContent>
    <f:content>
      <List
        id="list"
        items="{/Projects}"
        mode="SingleSelectMaster"
        selectionChange="onSelectionChange">
        <items>
          <ObjectListItem
            title="{Name}"
            type="Navigation"
            press="onPress">
            <attributes>
              <ObjectListItem
                text="{Description}"
                type="Active"/>
            </attributes>
            <firstStatus>
              <ObjectStatus
                text="{Type}"
                state="Success"/>
            </firstStatus>
          </ObjectListItem>
        </items>
      </List>
    </f:content>
  </f:DynamicPage>
</mvc:View>
```

### Master.controller.js - Navigation Logic

```javascript
// webapp/controller/Master/Master.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/f/library",
  "sap/base/Log"
], function(Controller, JSONModel, fLibrary, Log) {
  "use strict";

  var LayoutType = fLibrary.LayoutType;

  return Controller.extend("com.erdwithai.controller.Master", {

    onInit: function() {
      this._oViewModel = new JSONModel({
        isFilterBarVisible: false,
        headerExpanded: true
      });
      this.getView().setModel(this._oViewModel, "viewConfig");

      this._oList = this.byId("list");
      this._oListSelector = this.getOwnerComponent().oListSelector;

      this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
    },

    _onMasterMatched: function() {
      this._oListSelector.oWhenListLoadingIsDone.then(function() {
        this._selectFirstItem();
      }.bind(this));
    },

    _selectFirstItem: function() {
      var aItems = this._oList.getItems();
      if (aItems.length > 0) {
        this._oList.setSelectedItem(aItems[0]);
        this._showDetail(aItems[0].getBindingContext());
      }
    },

    onSelectionChange: function(oEvent) {
      var oListItem = oEvent.getParameter("listItem");
      this._showDetail(oListItem.getBindingContext());
    },

    onPress: function(oEvent) {
      var oItem = oEvent.getSource();
      this._showDetail(oItem.getBindingContext());
    },

    _showDetail: function(oBindingContext) {
      var sObjectId = oBindingContext.getProperty("ID");
      this.getRouter().navTo("detail", {
        projectId: sObjectId
      }, !sap.ui.Device.system.phone);
    },

    onSearch: function(oEvent) {
      var sQuery = oEvent.getParameter("query");
      if (sQuery) {
        this._oList.getBinding("items").filter([
          new sap.ui.model.Filter([
            new sap.ui.model.Filter("Name", sap.ui.model.FilterOperator.Contains, sQuery),
            new sap.ui.model.Filter("Description", sap.ui.model.FilterOperator.Contains, sQuery)
          ], false)
        ]);
      } else {
        this._oList.getBinding("items").filter([]);
      }
    },

    getRouter: function() {
      return this.getOwnerComponent().getRouter();
    }
  });
});
```

### Detail View with FCL Actions

```xml
<!-- webapp/view/Detail/Detail.view.xml -->
<mvc:View
  controllerName="com.erdwithai.controller.Detail"
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m"
  xmlns:f="sap.f"
  xmlns:form="sap.ui.layout.form">
  <f:DynamicPage
    id="detailPage"
    busy="{odata>/busy}"
    busyIndicatorDelay="{odata>/delay}"
    headerVisible="true"
    title="{odata>Name}"
    toggleHeaderOnTitleClick="{= !${device>/isPhone}}">
    <f:title>
      <Title text="{odata>Name}"/>
    </f:title>
    <f:navigationActions>
      <Button
        id="closeColumn"
        icon="sap-icon://decline"
        press="onCloseDetailPress"
        tooltip="Close column"
        visible="{= ${device>/isPhone} || ${device>/isNoTouch} }"/>
    </f:navigationActions>
    <f:headerContent>
      <ObjectAttribute title="Type" text="{odata>Type}"/>
      <ObjectAttribute title="Created" text="{path: 'CreatedAt', type: 'sap.ui.model.type.DateTime', formatOptions: { style: 'medium' }}"/>
    </f:headerContent>
    <f:content>
      <VBox>
        <Text text="{odata>Description}"/>
        <form:SimpleForm
          editable="false"
          layout="ResponsiveGridLayout"
          labelSpanXL="3"
          labelSpanL="3"
          labelSpanM="3"
          labelSpanS="12"
          adjustLabelSpan="false"
          emptySpanXL="4"
          emptySpanL="4"
          emptySpanM="4"
          emptySpanS="0"
          columnsXL="1"
          columnsL="1"
          columnsM="1"
          singleContainerFullSize="false">
          <form:content>
            <Label text="Project ID"/>
            <Text text="{odata>ID}"/>
            <Label text="Description"/>
            <Text text="{odata>Description}"/>
          </form:content>
        </form:SimpleForm>
      </VBox>
    </f:content>
    <f:footer>
      <OverflowToolbar>
        <ToolbarSpacer/>
        <Button
          id="editButton"
          text="Edit"
          type="Emphasized"
          press="onEdit"/>
        <Button
          id="deleteButton"
          text="Delete"
          type="Reject"
          press="onDelete"/>
      </OverflowToolbar>
    </f:footer>
  </f:DynamicPage>
</mvc:View>
```

### Detail.controller.js - FCL Column Management

```javascript
// webapp/controller/Detail/Detail.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/model/json/JSONModel",
  "sap/f/library",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, JSONModel, fLibrary, MessageToast, MessageBox) {
  "use strict";

  var LayoutType = fLibrary.LayoutType;

  return Controller.extend("com.erdwithai.controller.Detail", {

    onInit: function() {
      this.getRouter().getRoute("detail").attachPatternMatched(this._onDetailMatched, this);
      this.getRouter().getRoute("project").attachPatternMatched(this._onDetailMatched, this);
    },

    _onDetailMatched: function(oEvent) {
      var sObjectId = oEvent.getParameter("arguments").projectId;
      this._bindView(sObjectId);
      this._setLayout(LayoutType.TwoColumnsBeginExpanded);
    },

    _bindView: function(sObjectId) {
      var oViewModel = this.getView().getModel("viewConfig"),
        oDataModel = this.getView().getModel("odata");

      this.getView().bindElement({
        path: "/Projects(" + sObjectId + ")",
        events: {
          dataRequested: function() {
            oDataModel.setUseBatch(false);
          },
          dataReceived: function() {
            oDataModel.setUseBatch(true);
          }
        }
      });
    },

    _setLayout: function(sLayout) {
      var oFCL = this.getRootControl().byId("fcl");
      oFCL.setLayout(sLayout);
    },

    onCloseDetailPress: function() {
      this._setLayout(LayoutType.OneColumn);
      this.getRouter().navTo("master");
    },

    onEdit: function() {
      MessageToast.show("Edit functionality to be implemented");
    },

    onDelete: function() {
      var oViewModel = this.getView().getModel("viewConfig");
      var oDataModel = this.getView().getModel("odata");

      MessageBox.confirm("Are you sure you want to delete this project?", {
        onClose: function(oAction) {
          if (oAction === MessageBox.Action.OK) {
            oDataModel.remove(this.getView().getBindingContext().getPath(), {
              success: function() {
                MessageToast.show("Project deleted successfully");
                this._setLayout(LayoutType.OneColumn);
                this.getRouter().navTo("master");
              }.bind(this),
              error: function() {
                MessageToast.show("Error deleting project");
              }
            });
          }
        }.bind(this)
      });
    },

    getRouter: function() {
      return this.getOwnerComponent().getRouter();
    }
  });
});
```

---

## Component Architecture

### Base Controller Pattern

```javascript
// webapp/controller/BaseController.js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/routing/History",
  "sap/m/MessageToast",
  "sap/m/MessageBox"
], function(Controller, History, MessageToast, MessageBox) {
  "use strict";

  return Controller.extend("com.erdwithai.controller.BaseController", {

    getRouter: function() {
      return this.getOwnerComponent().getRouter();
    },

    getModel: function(sName) {
      return this.getView().getModel(sName);
    },

    setModel: function(oModel, sName) {
      return this.getView().setModel(oModel, sName);
    },

    getResourceBundle: function() {
      return this.getOwnerComponent().getModel("i18n").getResourceBundle();
    },

    getText: function(sTextId, aArgs) {
      return this.getResourceBundle().getText(sTextId, aArgs);
    },

    showMessage: function(sMessage, sType) {
      MessageToast.show(sMessage);
    },

    showError: function(sMessage) {
      MessageBox.error(sMessage);
    },

    showSuccess: function(sMessage) {
      MessageBox.success(sMessage);
    },

    onNavBack: function() {
      var sPreviousHash = History.getInstance().getPreviousHash();
      if (sPreviousHash !== undefined) {
        history.go(-1);
      } else {
        this.getRouter().navTo("master", {}, true);
      }
    }
  });
});
```

### Reusable Fragment

```xml
<!-- webapp/view/fragments/EditDialog.fragment.xml -->
<core:FragmentDefinition
  xmlns:core="sap.ui.core"
  xmlns="sap.m"
  xmlns:form="sap.ui.layout.form">
  <Dialog
    id="editDialog"
    title="{i18n>editDialogTitle}"
    contentWidth="500px">
    <content>
      <form:SimpleForm
        editable="true"
        layout="ResponsiveGridLayout"
        labelSpanXL="3"
        labelSpanL="3"
        labelSpanM="3"
        labelSpanS="12">
        <Label text="{i18n>nameLabel}"/>
        <Input
          id="nameInput"
          value="{odata>Name}"
          liveChange="validateInput"/>
        <Label text="{i18n>descriptionLabel}"/>
        <TextArea
          id="descriptionInput"
          value="{odata>Description}"
          rows="4"/>
      </form:SimpleForm>
    </content>
    <beginButton>
      <Button
        id="saveButton"
        text="{i18n>saveButton}"
        type="Emphasized"
        press="onSave"/>
    </beginButton>
    <endButton>
      <Button
        id="cancelButton"
        text="{i18n>cancelButton}"
        press="onCancel"/>
    </endButton>
  </Dialog>
</core:FragmentDefinition>
```

### Fragment Usage in Controller

```javascript
// webapp/controller/Detail/Detail.controller.js
sap.ui.define([
  "sap/ui/core/mvc/Controller",
  "sap/ui/core/Fragment"
], function(Controller, Fragment) {
  return Controller.extend("com.erdwithai.controller.Detail", {

    _oDialog: null,

    onEdit: function() {
      if (!this._oDialog) {
        this._oDialog = Fragment.load({
          name: "com.erdwithai.view.fragments.EditDialog",
          controller: this
        }).then(function(oDialog) {
          this.getView().addDependent(oDialog);
          return oDialog;
        }.bind(this));
      }

      this._oDialog.then(function(oDialog) {
        oDialog.open();
      });
    },

    onSave: function() {
      var oData = {
        Name: this.byId("nameInput").getValue(),
        Description: this.byId("descriptionInput").getValue()
      };

      this.getView().getModel().update(
        this.getView().getBindingContext().getPath(),
        oData,
        {
          success: function() {
            this._closeDialog();
            MessageToast.show("Changes saved successfully");
          }.bind(this),
          error: function() {
            MessageToast.show("Error saving changes");
          }
        }
      );
    },

    onCancel: function() {
      this._closeDialog();
    },

    _closeDialog: function() {
      this._oDialog.then(function(oDialog) {
        oDialog.close();
      });
    },

    validateInput: function(oEvent) {
      var sValue = oEvent.getParameter("value");
      var oInput = oEvent.getSource();
      if (sValue.length < 3) {
        oInput.setValueState("Error");
        oInput.setValueStateText("Name must be at least 3 characters");
      } else {
        oInput.setValueState("None");
      }
    }
  });
});
```

---

## Data Binding

### Model Creation

```javascript
// webapp/model/models.js
sap.ui.define([
  "sap/ui/model/json/JSONModel",
  "sap/ui/model/odata/v4/ODataModel",
  "sap/ui/Device",
  "sap/base/Log"
], function(JSONModel, ODataModel, Device, Log) {
  "use strict";

  return {
    createDeviceModel: function() {
      var oModel = new JSONModel(Device);
      oModel.setDefaultBindingMode("OneWay");
      return oModel;
    },

    createResourceModel: function() {
      var oModel = new sap.ui.model.resource.ResourceModel({
        bundleName: "com.erdwithai.i18n.i18n"
      });
      return oModel;
    },

    createODataModel: function() {
      var sUrl = "/api/odata/";
      var oModel = new ODataModel({
        serviceUrl: sUrl,
        synchronizationMode: "None",
        operationMode: "Server",
        autoExpandSelect: true,
        earlyRequests: true
      });
      return oModel;
    },

    createJSONModel: function(sUrl) {
      var oModel = new JSONModel(sUrl);
      return oModel;
    }
  };
});
```

### Property Binding

```xml
<!-- Simple property binding -->
<Text text="{odata>Name}"/>

<!-- Formatting binding -->
<Text text="{path: 'CreatedAt', type: 'sap.ui.model.type.DateTime', formatOptions: { style: 'medium' }}"/>

<!-- Expression binding -->
<ObjectStatus
  text="{= ${odata>Status} === 'Active' ? 'Active' : 'Inactive' }"
  state="{= ${odata>Status} === 'Active' ? 'Success' : 'Error' }"/>

<!-- Custom formatter -->
<Text text="{path: 'odata>Amount', formatter: '.formatter.formatCurrency'}"/>
```

### Aggregation Binding

```xml
<!-- List binding -->
<List items="{/Projects}">
  <items>
    <StandardListItem
      title="{Name}"
      description="{Description}"/>
  </items>
</List>

<!-- Filter binding -->
<List
  items="{
    path: '/Projects',
    parameters: {
      $filter: 'Type eq \'web\''
    }
  }">
</List>

<!-- Sort and filter -->
<List
  items="{
    path: '/Projects',
    sorter: {
      path: 'Name',
      descending: false
    },
    parameters: {
      $select: 'ID,Name,Description,Type'
    }
  }">
</List>
```

### Two-Way Binding

```javascript
// Enable two-way binding in OData model
var oModel = new ODataModel({
  serviceUrl: "/api/odata/",
  defaultBindingMode: "TwoWay",
  defaultUpdateMethod: "MERGE"
});

// XML view with two-way binding
<Input
  value="{odata>Name}"
  liveChange="onInputChange"/>
```

### Formatter Functions

```javascript
// webapp/model/formatter.js
sap.ui.define([], function() {
  "use strict";

  return {
    formatCurrency: function(sValue) {
      if (!sValue) {
        return "";
      }
      return parseFloat(sValue).toFixed(2) + " USD";
    },

    formatDate: function(oDate) {
      if (!oDate) {
        return "";
      }
      var oDateFormat = sap.ui.core.format.DateFormat.getDateTimeInstance({
        style: "medium"
      });
      return oDateFormat.format(oDate);
    },

    formatStatus: function(sStatus) {
      var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
      if (!sStatus) {
        return "";
      }
      return oResourceBundle.getText("status." + sStatus, sStatus);
    },

    formatState: function(sStatus) {
      switch (sStatus) {
        case "Active":
          return "Success";
        case "Inactive":
          return "Warning";
        case "Error":
          return "Error";
        default:
          return "None";
      }
    },

    formatVisible: function(sValue) {
      return !!sValue;
    }
  };
});
```

---

## OData Integration

### OData Model Configuration

```javascript
// V4 OData Model
var oModel = new ODataModel({
  serviceUrl: "/api/odata/",
  synchronizationMode: "None",
  operationMode: "Server",
  autoExpandSelect: true,
  earlyRequests: true,
  groupId: "$direct",
  updateGroupId: "$auto"
});

// Enable batch operations
oModel.setUseBatch(true);
```

### CRUD Operations

```javascript
// Create (POST)
onCreate: function() {
  var oModel = this.getView().getModel("odata");
  var oData = {
    Name: "New Project",
    Description: "Project Description",
    Type: "web"
  };

  oModel.create("/Projects", oData, {
    success: function() {
      MessageToast.show("Project created successfully");
    },
    error: function(oError) {
      MessageBox.error("Error creating project");
    }
  });
}

// Read (GET) - Automatic via binding
onRead: function(sId) {
  var oModel = this.getView().getModel("odata");
  var sPath = "/Projects(" + sId + ")";
  var oData = oModel.getProperty(sPath);
}

// Update (PATCH/MERGE)
onUpdate: function(sId, oData) {
  var oModel = this.getView().getModel("odata");
  var sPath = "/Projects(" + sId + ")";

  oModel.update(sPath, oData, {
    success: function() {
      MessageToast.show("Project updated successfully");
    },
    error: function(oError) {
      MessageBox.error("Error updating project");
    }
  });
}

// Delete (DELETE)
onDelete: function(sId) {
  var oModel = this.getView().getModel("odata");
  var sPath = "/Projects(" + sId + ")";

  oModel.remove(sPath, {
    success: function() {
      MessageToast.show("Project deleted successfully");
    },
    error: function(oError) {
      MessageBox.error("Error deleting project");
    }
  });
}
```

### OData List Binding with Controls

```xml
<List
  id="projectList"
  items="{
    path: '/Projects',
    parameters: {
      $select: 'ID,Name,Description,Type,CreatedAt',
      $orderby: 'CreatedAt desc',
      $top: 20
    },
    events: {
      dataReceived: '.onDataReceived'
    }
  }"
  growing="true"
  growingThreshold="20"
  noDataText="{i18n>noProjectsText}">
  <items>
    <ObjectListItem
      title="{Name}"
      type="Navigation"
      press="onItemPress"
      number="{Type}"
      numberUnit="Type">
      <attributes>
        <ObjectListItem
          text="{Description}"
          type="Active"/>
      </attributes>
      <firstStatus>
        <ObjectStatus
          text="{
            path: 'CreatedAt',
            type: 'sap.ui.model.type.DateTime',
            formatOptions: { style: 'short' }
          }"
          state="Success"/>
      </firstStatus>
    </ObjectListItem>
  </items>
</List>
```

---

## Routing and Navigation

### Router Configuration

```javascript
// webapp/Component.js
init: function() {
  UIComponent.prototype.init.apply(this, arguments);

  this.getRouter().initialize();
}

// In manifest.json
"routing": {
  "config": {
    "routerClass": "sap.f.routing.Router",
    "viewType": "XML",
    "viewPath": "com.erdwithai.view",
    "controlId": "fcl",
    "controlAggregation": "beginColumnPages"
  }
}
```

### Navigation Methods

```javascript
// Navigate to detail
onItemPress: function(oEvent) {
  var sObjectId = oEvent.getSource().getBindingContext().getProperty("ID");
  this.getRouter().navTo("detail", {
    projectId: sObjectId
  }, !sap.ui.Device.system.phone);
}

// Navigate with parameters
this.getRouter().navTo("entity", {
  projectId: sProjectId,
  entityId: sEntityId
});

// Navigate back
onNavBack: function() {
  var oHistory = History.getInstance();
  var sPreviousHash = oHistory.getPreviousHash();

  if (sPreviousHash !== undefined) {
    window.history.go(-1);
  } else {
    this.getRouter().navTo("master", {}, true);
  }
}
```

---

## Performance Optimization

### Lazy Loading Components

```xml
<!-- Declarative lazy loading -->
<mvc:View
  xmlns:mvc="sap.ui.core.mvc"
  xmlns="sap.m">
  <App>
    <Page>
      <Button
        text="Load Component"
        press="onLoadComponent"/>
      <mvc:HTMLView
        id="lazyView"
        viewName="com.erdwithai.view.Lazy"
        async="true"/>
    </Page>
  </App>
</mvc:View>
```

### Model Optimization

```javascript
// Use $select for partial data
var oListBinding = oList.getBinding("items");
oListBinding.changeParameters({
  $select: "ID,Name,Description",
  $expand: "Owner($select=ID,Name)"
});

// Disable automatic refresh
oModel.setRefreshAfterChange(false);

// Batch requests
oModel.setUseBatch(true);
```

---

## Bun.js Runtime Specifics

### UI5 Configuration for Bun

```yaml
# ui5.yaml
specVersion: "3.0"
metadata:
  name: com.erdwithai
type: application
builder:
  resources:
    excludes:
      - /test/
  customTasks:
    - name: deploy-to-abap
      afterTask: generateCachebusterInfo
      configuration:
        target:
          url: http://localhost:8080
          client: "001"
        app:
          name: ZERDWITHAI
          description: ERDwithAI Application
          package: ZERD_WITHAI
          transport: S4HK900123
```

### Build Configuration

```json
{
  "scripts": {
    "build": "ui5 build --all",
    "serve": "ui5 serve --config ui5.yaml",
    "test": "bun test"
  },
  "ui5": {
    "dependencies": [
      "@openui5/sap.m",
      "@openui5/sap.f",
      "@openui5/sap.ui.core"
    ]
  }
}
```

---

## Additional Resources

- [OpenUI5 Documentation](https://openui5.hana.ondemand.com)
- [SAP Fiori Fundamentals](https://experience.sap.com/fiori-design/)
- [Flexible Column Layout](https://ui5.sap.com/#/topic/7cdbfb2f1bb04ce39bcb322cdca80e8c)
- [OData V4 Model](https://ui5.sap.com/#/topic/82f4e61c17074b8f913911e7e6a8ca74)