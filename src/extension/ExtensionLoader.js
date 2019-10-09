sap.ui.define([
    "jquery.sap.global",
    "ps/app/ui/extension/InteractionExtensionBase",
    "ps/app/ui/extension/TabExtensionBase",
    "ps/app/ui/utils/Utils",
    "sap/m/IconTabFilter",
    "sap/ui/core/Control"
], function (jQuery, InteractionExtensionBase, TabExtensionBase, Utils, IconTabFilter, Control) {
    "use strict";

    /**
     * Constructor for an ExtensionLoader.
     * @constructor
     * @param {object}                              mNavTargets    Current navigation targets
     *
     * @classdesc
     * ExtensionLoader helper to load and instantiate interaction and tab extensions for the Patient Summary.
     * @alias sap.hc.hph.patient.app.ui.content.extension.ExtensionLoader
     */
    var ExtensionLoader = function ExtensionLoader(mNavTargets) {
        this.mNavTargets = mNavTargets;
    };

    /**
     * Supported extensions by this Loader.
     * @enum {string}
     */
    ExtensionLoader.Extensions = {
        Interaction: "Interaction",
        Tab: "Tab"
    };

    /**
     * Get a translated text from the ResourceModel.
     * @private
     * @see jQuery.sap.util.ResourceBundle.getText
     * @param {string}   sKey  Text key
     * @param {string[]} aArgs List of parameters which should replace the place holders
     * @returns {string} The value belonging to the key, if found; otherwise the key itself.
     */
    ExtensionLoader.prototype._getText = function (sKey, aArgs) {
        return Utils.getText(sKey, aArgs);
    };

    /**
     * Log an extension error.
     * Helper function to ensure all extension errors have a common format.
     * @param {string} sExtensionId Extension id
     * @param {Error}  oError       Error object whose message will be displayed
     */
    ExtensionLoader.prototype.logExtensionError = function (sExtensionId, oError) {
        // FIXME
        // MessageBox.error(this._getText("HPH_PAT_CONTENT_EXT_ERROR", [sExtensionId]), {
        //     title: this._getText("HPH_PAT_CONTENT_NOTIFICATION_ERROR"),
        //     details: oError.message
        // });
        jQuery.sap.log.error("Failed to load or instantiate extension \"" + sExtensionId + "\": " + oError.message);
    };

    ExtensionLoader.prototype._createExtension = {
        /**
         * Create a new interaction extension object.
         * Perform instantiation and validation of provided contribution.
         * @private
         * @param {Object}                                                               mExtensionConfig Extension configuration object with id and annotations
         * @param {sap.hc.hph.patient.app.ui.content.extension.InteractionExtensionBase} Extension        Extension Class extending the extension base
         * @returns {Object} Extension object with id, annotations, and an instance of the class
         */
        Interaction: function createInteractionExtension(mExtensionConfig, Extension) {
            var oExtension = new Extension();
            if (!(oExtension instanceof InteractionExtensionBase)) {
                var sName = InteractionExtensionBase.getMetadata().getName();
                throw new Error(this._getText("HPH_PAT_CONTENT_EXT_ERROR_BASE", [sName]));
            }

            return {
                id: mExtensionConfig.id,
                annotations: mExtensionConfig.annotations,
                controller: oExtension
            };
        },
        /**
         * Create a new tab extension object.
         * Perform instantiation and validation of provided contribution.
         * @private
         * @param {Object}                                                       mExtensionConfig Extension configuration object with id and key
         * @param {sap.hc.hph.patient.app.ui.content.extension.TabExtensionBase} Extension        Extension Class extending the extension base
         * @returns {Object} Extension object with id, key, and a function to create a new IconTabFilter
         */
        Tab: function createTabExtension(mExtensionConfig, Extension) {
            var oExtension = new Extension();
            if (!(oExtension instanceof TabExtensionBase)) {
                var sName = TabExtensionBase.getMetadata().getName();
                throw new Error(this._getText("HPH_PAT_CONTENT_EXT_ERROR_BASE", [sName]));
            }

            var sText = oExtension.getText();
            if (typeof sText !== "string") {
                throw new Error(this._getText("HPH_PAT_CONTENT_EXT_ERROR_T_TEXT_TYPE"));
            } else if (sText === "") {
                throw new Error(this._getText("HPH_PAT_CONTENT_EXT_ERROR_T_TEXT_EMPTY"));
            }
            /**
             * Get all navigation targets which are prefixed with the extension key and removes the prefix.
             * E.g. {customTab_page: 2, myTab_filter: 'asdf'} => {filter: 'asdf'} for extension 'myTab'
             * @param  {string} sExtensionKey   Tab extension key
             * @param  {array} aNavTargets      List of defined navigation targets
             * @returns {object}                Object only containing shortened navigation targets of selected extension
             */
            var getExtensionNavTargets = function (sExtensionKey, aNavTargets) {
                var mExtNavTargets = {};
                var aExtNavTargetsKeys = Object.keys(this.mNavTargets).filter(function (sNavTarget) {
                    return sNavTarget.indexOf(sExtensionKey + "_") === 0;
                });
                aExtNavTargetsKeys.forEach(function (sNavTargetKey) {
                    var sExtNavTargetsKey = sNavTargetKey.split(sExtensionKey + "_")[1];
                    // Navigation target must be defined
                    if (aNavTargets.indexOf(sExtNavTargetsKey) !== -1) {
                        mExtNavTargets[sExtNavTargetsKey] = this.mNavTargets[sNavTargetKey];
                    }
                }, this);
                return mExtNavTargets;
            }.bind(this);

            var fGetIconTabFilter = function () {
                var mExtNavTargets = getExtensionNavTargets(mExtensionConfig.key, mExtensionConfig.navTargets || []);
                var vContent = oExtension.getContent(mExtNavTargets);
                if (vContent instanceof Array) {
                    vContent.forEach(function (oContent) {
                        if (!(oContent instanceof Control)) {
                            throw new Error(this._getText("HPH_PAT_CONTENT_EXT_ERROR_T_CONTENT_TYPE"));
                        }
                    });
                } else if (!(vContent instanceof Control)) {
                    throw new Error(this._getText("HPH_PAT_CONTENT_EXT_ERROR_T_CONTENT_TYPE"));
                }
                return new IconTabFilter({
                    key: mExtensionConfig.key,
                    text: sText,
                    content: vContent
                });
            }.bind(this);

            return {
                id: mExtensionConfig.id,
                key: mExtensionConfig.key,
                getTab: fGetIconTabFilter
            };
        }
    };

    /**
     * Register an extension namespace as SAPUI5 module path.
     * If the namespace had been registered with a different path before, an error is thrown.
     * @private
     * @param {string} sNamespace Module path as dot separated string
     * @param {string} sPath      Absolute file path as slash separated string
     */
    ExtensionLoader.prototype._registerExtensionPath = function (sNamespace, sPath) {
        var sDefaultPath = jQuery.sap.getModulePath("");
        var sCurrentPath = jQuery.sap.getModulePath(sNamespace);
        if (sCurrentPath === sPath) {
            // Path already registered, do nothing
        } else if (sDefaultPath + "/" + sNamespace.replace(/\./g, "/") === sCurrentPath) {
            jQuery.sap.registerModulePath(sNamespace, sPath);
        } else {
            throw new Error(this._getText("HPH_PAT_CONTENT_EXT_ERROR_MODULE_PATH", [sNamespace, sCurrentPath, sPath]));
        }
    };

    /**
     * Load a single extension of a given type.
     * @private
     * @param {Object}                                                                 mExtensionConfig Extension configuration object
     * @param {sap.hc.hph.patient.app.ui.content.extension.ExtensionLoader.Extensions} sType            Type of the extension
     * @returns {Promise} Promise that resolves with an Extension object or empty in case of failure
     */
    ExtensionLoader.prototype._loadExtension = function (mExtensionConfig, sType) {
        return new Promise(function (resolve) {
            try {
                // Register module path of extensions
                this._registerExtensionPath(mExtensionConfig.namespace, mExtensionConfig.path);

                // Load Extension file
                var sExtension = mExtensionConfig.namespace.replace(/\./g, "/") + "/Extension";
                sap.ui.require([sExtension], function (Extension) {
                    try { // Try to instantiate the Extension
                        resolve(this._createExtension[sType].call(this, mExtensionConfig, Extension));
                    } catch (oError) {
                        this.logExtensionError(mExtensionConfig.id, oError);
                        resolve();
                    }
                }.bind(this));
            } catch (oError) {
                this.logExtensionError(mExtensionConfig.id, oError);
                resolve();
            }
        }.bind(this));
    };

    /**
     * Load a list of extensions of a common type.
     * @param {object[]}                                                               aExtensionConfigs List of extension configuration objects
     * @param {sap.hc.hph.patient.app.ui.content.extension.ExtensionLoader.Extensions} sType             Type of the extensions
     * @returns {Promise} Promise that resolves with a list of Extensions
     */
    ExtensionLoader.prototype.loadExtensions = function (aExtensionConfigs, sType) {
        return new Promise(function (resolve) {
            if (!ExtensionLoader.Extensions.hasOwnProperty(sType)) {
                var sExtensions = Object.keys(ExtensionLoader.Extensions).join(", ");
                jQuery.sap.log.error("Cannot load extension of type \"" + sType + "\". Supported extensions are " + sExtensions + ".");
                return resolve([]).promise();
            }
            if (aExtensionConfigs.length === 0) {
                return resolve([]).promise();
            }

            var aExtensionPromises = aExtensionConfigs.map(function (mExtensionConfig) {
                return this._loadExtension(mExtensionConfig, sType);
            }, this);

            Promise.all(aExtensionPromises).then(function (aExtensions) {
                resolve(aExtensions.filter(function (mExtension) {
                    return Boolean(mExtension);
                }));
            });
        }.bind(this));
    };

    return ExtensionLoader;
});
