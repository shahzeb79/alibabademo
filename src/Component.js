jQuery.sap.registerModulePath("ps.app.ui", "/ps/app/ui");

sap.ui.define([
    "jquery.sap.global",
    "ps/app/ui/extension/ExtensionLoader",
    "ps/app/ui/utils/Utils",
    "sap/m/MessageBox",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/resource/ResourceModel"
], function (jQuery, ExtensionLoader, Utils, MessageBox, UIComponent, JSONModel, ResourceModel) {
    "use strict";

    /**
     * Constructor for the Patient Summary content Component.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * This Component acts like a control for the Patient Summary functionality.
     * It provides the Timeline, Overview, and Related Documents tabs and opens the Variant Browser View for a single
     * patient. The data loading is also handled internally.
     * @extends sap.ui.core.UIComponent
     * @alias ps.app.ui.Component
     */
    var Component = UIComponent.extend("ps.app.ui.Component", {
        metadata: {
            name: "Patient Summary - Content",
            version: "${version}",
            includes: [
                "css/style.css"
            ],
            dependencies: {
                libs: [
                    "ps.app.ui.lib",
                    "sap.m",
                    "sap.ui.core"
                ],
                ui5version: "1.28.29"
            },
            config: {
                resourceBundle: "i18n/messagebundle.hdbtextbundle",
                configService: "/ps/app/api/v1/configs",
                patientService: "/ps/app/api/v1/patients"
            },

            rootView: "ps.app.ui.view.Content",

            properties: {
                /**
                 * Id of the patient to display.
                 * A change of this property leads to a reloading and rerending.
                 */
                patientId: {
                    type: "string",
                    group: "Data"
                },
                /**
                 * Whether to show the header with patient masterdata.
                 * A change of this property leads to a reloading and rerending.
                 */
                showHeader: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: true
                },
                /**
                 * The selected tab.
                 */
                tab: {
                    type: "string",
                    group: "Behavior",
                    defaultValue: "timeline"
                },
                /**
                 * Maps navigation targets for tabs representing the application state to their values.
                 * Navigation targets are prefixed with the corresponding extension key.
                 */
                navTargets: {
                    type: "object",
                    group: "Behavior",
                    defaultValue: {}
                }
            },
            events: {
                /**
                 * Internal event to tell the controller that a config has been chosen (either automatically or
                 * manually) and downloaded so that the controller can start requesting the patient data.
                 */
                reload: {
                    parameters: {
                        /**
                         * Id of the patient to display.
                         */
                        patientId: {
                            type: "string"
                        }
                    }
                },
                /**
                 * Event to be fired if the selection of the config fails.
                 * This can have two reasons:
                 * 1. There is no config assigned to the current user
                 * 2. There are several configs assigned but the user cancelled the manual selection
                 * The reasons are reflected in the parameter.
                 */
                configSelectionFailed: {
                    parameters: {
                        /**
                         * True, if the user cancelled the config selection
                         * @type {Boolean}
                         */
                        cancelled: {
                            type: "boolean",
                            default: false
                        }
                    }
                },

                /**
                 * Event to be fired when the selected tab is changed.
                 */
                tabChange: {
                    parameters: {
                        /**
                         * The newly selected tab.
                         * @type {ps.app.ui.Component.Tab}
                         */
                        tab: {
                            type: "ps.app.ui.Component.Tab"
                        }
                    }
                },
                /**
                 * Event to be fired before the patient masterdata has been loaded.
                 */
                beforeDataLoad: {},

                /**
                 * Event to be fired after the patient masterdata has been loaded.
                 */
                afterDataLoad: {},

                /**
                 * Event to be fired if no patient data was found for the given patient id.
                 */
                patientNotFound: {
                    parameters: {
                        /**
                         * The given patient id.
                         * @type {string}
                         */
                        patientId: {
                            type: "string"
                        }
                    }
                },
                /**
                 * Event to be fired when a navigation target gets changed.
                 */
                navigationTargetChange: {
                    parameters: {
                        navTarget: {
                            type: "string"
                        },
                        value: {
                            type: "any"
                        }
                    }
                }
            }
        }
    });


    /**
     * Initialize the component.
     * Create resource model and request the config information from the config service.
     * If there is only one, it is selected and the application will start immediately.
     * If there is more than one without any marked as default, a selection dialog is shown to the user.
     * Initialization of the content will continue once a config has been selected.
     * @override
     * @protected
     */
    Component.prototype.init = function () {
        sap.ui.core.UIComponent.prototype.init.apply(this, arguments);

        this.DefaultTab = "timeline";

        var mConfig = this.getMetadata().getConfig();

        var oResourceModel = new ResourceModel({
            bundleUrl: [jQuery.sap.getModulePath("ps.app.ui"), mConfig.resourceBundle].join("/")
        });
        this.setModel(oResourceModel, "i18n");

        var oResourceBundle = oResourceModel.getResourceBundle();
        Utils.setResourceBundle(oResourceBundle);

        this.setModel(new JSONModel({
            tab: this.getTab(),
            tabs: {
                overview: {
                    visible: false
                }
            },
            showHeader: this.getShowHeader(),
            busy: {
                interactions: true,
                masterdata: true
            },
            error: {
                interactions: {
                    reason: ""
                }
            }
        }), "state");

        this.setModel(new JSONModel(), "patient");


        this.aInteractionExtensions = [];

        // FIXME
        Utils.ajax(mConfig.configService).done(jQuery.proxy(function (aData) {
            if (aData.length === 0) {
                MessageBox.show(Utils.getText("HPH_PAT_CONTENT_NO_CONFIG_ASSIGNED"), {
                    icon: MessageBox.Icon.ERROR,
                    styleClass: Utils.getContentDensityClass(),
                    title: Utils.getText("HPH_PAT_CONTENT_NOTIFICATION_ERROR"),
                    onClose: function () {
                        this.fireConfigSelectionFailed({cancelled: false});
                    }
                });
            } else if (aData.length === 1) {
                Utils.ajax({
                    url: this.getMetadata().getConfig().configService + "/" + aData[0].configId,
                    type: "GET"
                }).done(jQuery.proxy(function (mData) {
                    this._loadApplication(mData);
                }, this)).fail(function () {
                    this.fireConfigSelectionFailed({
                        cancelled: false
                    });
                }.bind(this));
            } else {
                aData[0].selected = true;
                this._openConfigSelection(aData);
            }
        }, this));

        var oEventBus = sap.ui.getCore().getEventBus();
        oEventBus.subscribe("patient.summary.extentions.tab", "NAVIGATION_TARGET_CHANGED", this._onNavTargetChanged, this);
    };

    /**
     * Cleans up the Component instance before destruction.
     * Unsubscribe events.
     * @protected
     * @override
     */
    Component.prototype.exit = function () {
        var oEventBus = sap.ui.getCore().getEventBus();
        oEventBus.unsubscribe("patient.summary.extentions.tab", "NAVIGATION_TARGET_CHANGED", this._onNavTargetChanged, this);
    };

    /**
     * Returns the content of {@link sap.ui.core.UIComponent#createContent}.
     * If you specified a <code>rootView</code> in your metadata or in the descriptor file (manifest.json),
     * you will get the instance of the root view.
     * This getter will only return something if the {@link sap.ui.core.UIComponent#init} function was invoked.
     * If <code>createContent</code> is not implemented, and there is no root view, it will return <code>null</code>.
     * @protected
     * @returns {sap.ui.core.Control} the control created by {@link sap.ui.core.UIComponent#createContent}
     * FUTURE: Remove with SAPUI5 1.44
     */
    Component.prototype.getRootControl = function () {
        return this.getAggregation("rootControl");
    };

    /**
     * Load the list of available configurations and open the selection Dialog.
     */
    Component.prototype.openConfigSelectionDialog = function () {
        // FIXME
        var sUrl = this.getMetadata().getConfig().configService;
        Utils.ajax(sUrl).done(jQuery.proxy(function (aData) {
            aData.forEach(function (mDatum) {
                mDatum.selected = mDatum.configId === this.getModel("meta").getProperty("/configId");
            }, this);
            this._openConfigSelection(aData);
        }, this));
    };

    /**
     * Open the selection Dialog with the given list of configurations.
     * @private
     * @param {object[]} aConfigs List of configuration objects
     */
    Component.prototype._openConfigSelection = function (aConfigs) {
        var sFragmentName = "ps.app.ui.view.ConfigSelectionDialog";
        var oConfigSelectionDialog = sap.ui.xmlfragment(sFragmentName, this);
        oConfigSelectionDialog.setModel(new JSONModel({
            configs: aConfigs,
            default: false
        }));
        oConfigSelectionDialog.setModel(this.getModel("i18n"), "i18n");
        // FIXME
        oConfigSelectionDialog.addStyleClass(Utils.getContentDensityClass());
        oConfigSelectionDialog.open();
    };

    /**
     * Loads the application with a given configuration.
     * Set up relevant models and load configured extensions.
     * @private
     * @param {object} mConfig patient config object
     */
    Component.prototype._loadApplication = function (mConfig) {
        this._oPatientModel = new JSONModel(mConfig.config);

        this._oPatientModel.setSizeLimit(Infinity);
        this.setModel(this._oPatientModel);
        this.getModel("state").setProperty("/tabs", mConfig.config.inspectorOptions);
        this.setModel(new JSONModel(mConfig.meta), "meta");

        // Load all extension in parallel
        var oExtensionLoader = new ExtensionLoader(this.getNavTargets());
        var aInteractionExtensions = [];
        if (mConfig.hasOwnProperty(mConfig.extensions) && Array.isArray(mConfig.extensions.interaction)){
            aInteractionExtensions = mConfig.extensions.interaction;
        }
        Promise.all([
            oExtensionLoader.loadExtensions(aInteractionExtensions, ExtensionLoader.Extensions.Interaction),
            oExtensionLoader.loadExtensions(mConfig.config.inspectorOptions.tabExtensions, ExtensionLoader.Extensions.Tab)
        ]).then(function (aExtensionLists) {
            this.aInteractionExtensions = aExtensionLists[0];

            // Add the Extension tabs to the IconTabBar
            var oPatientIconTabBar = this.getRootControl().byId("patientIconTabBar");

            // Remove tab extensions created previously
            var aTabs = oPatientIconTabBar.getItems();
            aTabs.forEach(function (oTab) {
                var sKey = oTab.getKey();
                if (sKey !== "timeline" && sKey !== "overview") {
                    oPatientIconTabBar.removeItem(oTab);
                }
            });

            aExtensionLists[1].forEach(function (mTabExtension) {
                try {
                    // Create the IconTabFilters with this Component as owner
                    oPatientIconTabBar.addItem(this.runAsOwner(mTabExtension.getTab));
                } catch (oError) {
                    oExtensionLoader.logExtensionError(mTabExtension.id, oError);
                }
            }, this);
            // Trigger the tab selection in case the url specifies an extension tab
            oPatientIconTabBar.setSelectedKey(this.getTab());

            this.fireReload({
                patientId: this.getPatientId()
            });
        }.bind(this));
    };

    /**
     * Ensures navigation target key uniqueness and propagates the event to the integrating component.
     * @listens patient.summary.extentions.tab#NAVIGATION_TARGET_CHANGED
     * @private
     * @param {String} sChannelId Event Channel Id
     * @param {String} sEventId   Event Id
     * @param {Object} mData      Event Data, with properties "extensionKey", "navTarget" and "value"
     */
    Component.prototype._onNavTargetChanged = function (sChannelId, sEventId, mData) {
        var sNavTarget = mData.navTarget;
        var sNavTargetValue = mData.value;
        var sExtensionKey = mData.extensionKey;

        var aTabExtensionConfigs = this.getModel().getProperty("/inspectorOptions/tabExtensions");

        var aThisTabExtConfigs = aTabExtensionConfigs.filter(function (oConfig) {
            return oConfig.key === sExtensionKey;
        });


        // Check for the navigation target change to be valid
        if (aThisTabExtConfigs.length === 1) {
            if (Array.isArray(aThisTabExtConfigs[0].navTargets) && aThisTabExtConfigs[0].navTargets.indexOf(sNavTarget) !== -1) {
                // prefix the navigation target with the extension key to avoid collisions.
                var sUniqueNavTarget = sExtensionKey + "_" + sNavTarget;

                this.fireNavigationTargetChange({
                    navTarget: sUniqueNavTarget,
                    value: sNavTargetValue
                });
            } else {
                jQuery.sap.log.error("The navigation target is not defined.");
            }
        } else if (aThisTabExtConfigs.length > 1) {
            jQuery.sap.log.error("The extension key is not unique.");
        } else {
            jQuery.sap.log.error("The extension key does not match any known extension.");
        }
    };

    Component.prototype.notifyPatientNotFound = function (sPatientId) {
        this.firePatientNotFound({
            patientId: sPatientId
        });
    };

    Component.prototype.notifyDataLoadStarted = function () {
        this.fireBeforeDataLoad();
    };
    Component.prototype.notifyDataLoadFinished = function () {
        this.fireAfterDataLoad();
    };

    /**
     * Setter for property patientId.
     * Only updates the property if it has changed.
     * If the patient config has already been loaded, fire the reload event to update the view.
     * @param {string} sPatientId Patient Id
     * @override
     */
    Component.prototype.setPatientId = function (sPatientId) {
        if (this.getPatientId() !== sPatientId) {
            this.setProperty("patientId", sPatientId, true);
            if (this._oPatientModel) {
                this.fireReload({
                    patientId: sPatientId
                });
            }
        }
    };

    /**
     * Setter for property showHeader.
     * Only updates the property if it has changed.
     * Updates the state model and if the patient config has already been loaded,
     * fire the reload event to update the view.
     * @param {boolean} bShowHeader Whether or not to show the patient masterdata
     * @override
     */
    Component.prototype.setShowHeader = function (bShowHeader) {
        if (this.getShowHeader() !== bShowHeader) {
            this.setProperty("showHeader", bShowHeader, true);
            this.getModel("state").setProperty("/showHeader", bShowHeader);
            if (this._oPatientModel) {
                this.fireReload({
                    patientId: this.getPatientId()
                });
            }
        }
    };

    /**
     * Setter for property tab.
     * Updates the state model.
     * @param {string} sTab Selected Tab, should be "timeline" or "overview.
     * @override
     */
    Component.prototype.setTab = function (sTab) {
        if (!sTab) {
            sTab = this.DefaultTab;
        }
        this.fireTabChange({
            tab: sTab
        });
        this.setProperty("tab", sTab, true);
        this.getModel("state").setProperty("/tab", sTab);
    };

    /**
     * Resets all customized timeline settings.
     */
    Component.prototype.resetSettings = function () {
        this.getRootControl().getController().resetSettings();
    };

    /**
     * Handler for Ok Button pressed in the Config Selection Dialog.
     * Creates a configData object from the selection, gets the configuration from the backend and continues
     * initializing the application.
     * If the Save as Default CheckBox has been selected, sends another request to set the default configuration.
     * @param {sap.ui.base.Event} oEvent List selectionChange Event
     */
    Component.prototype.onConfigSelected = function (oEvent) {
        var oDialog = oEvent.getSource().getParent().getParent();
        oDialog.setBusyIndicatorDelay(0).setBusy(true);
        var mConfigData = oEvent.getSource().getModel().getProperty("/configs").filter(function (mConfig) {
            return mConfig.selected;
        })[0];
        Utils.ajax({
            url: this.getMetadata().getConfig().configService + "/" + mConfigData.configId,
            type: "GET"
        }).done(jQuery.proxy(function (mData) {
            oDialog.destroy();
            this._loadApplication(mData);
        }, this)).fail(function () {
            this.fireConfigSelectionFailed({
                cancelled: false
            });
        }.bind(this));
        if (oEvent.getSource().getModel().getProperty("/default")) {
            mConfigData.action = "setDefault";
            Utils.ajax({
                url: this.getMetadata().getConfig().configService,
                type: "POST",
                data: JSON.stringify(mConfigData),
                contentType: "application/json;charset=utf-8"
            });
        }
    };

    /**
     * Handler for the Config Selection Dialog Cancel Button press.
     * Closes the Dialog which will trigger the onClose event.
     * @param {sap.ui.base.Event} oEvent Button Press Event
     */
    Component.prototype.onClosePressed = function (oEvent) {
        oEvent.getSource().getParent().getParent().close();
    };

    /**
     * Handler for the Config Selection Dialog close event.
     * Is called if the Config Selection Dialog is closed without selecting a config.
     */
    Component.prototype.onDialogClose = function () {
        if (!this._oPatientModel) {
            this.fireConfigSelectionFailed({
                cancelled: true
            });
        }
    };

    /**
     * Gets the title based on currently applicable configuration.
     * @returns {string} Returns the configured title.
     */
    Component.prototype.getTitle = function () {
        return this.getModel().getProperty("/masterdata/title/0/text");
    };

    /**
     * Get a list of Extensions that are subscribed to the given annotation.
     * @param   {string} sAnnotation Annotation to filter by
     * @returns {string} Returns the configured title.
     */
    Component.prototype.getExtensions = function (sAnnotation) {
        return this.aInteractionExtensions.filter(function (mExtension) {
            return mExtension.annotations.indexOf(sAnnotation) !== -1;
        });
    };

    return Component;
});
