sap.ui.define([
    "jquery.sap.global",
    "ps/app/ui/lib/Chart",
    "ps/app/ui/lib/library",
    "ps/app/ui/lib/TileAnnotation",
    "ps/app/ui/utils/Utils",
    "sap/m/GroupHeaderListItem",
    "sap/m/MessageBox",
    "sap/m/ObjectAttribute",
    "sap/ui/core/format/NumberFormat",
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter"
], function (jQuery, Chart, library, TileAnnotation, Utils, GroupHeaderListItem, MessageBox, ObjectAttribute, NumberFormat, Controller, Filter) {
    "use strict";

    /**
     * Constructor for the Patient Summary Content Controller.
     * @constructor
     *
     * @classdesc
     * This Controller is responsible for loading the patient data and handling all actions on the tabs of the Patient Summary.
     * @extends sap.ui.core.mvc.Controller
     * @alias ps.app.ui.view.Content
     */
    var ContentController = Controller.extend("ps.app.ui.view.Content");

    /**
     * Initialize the Controller.
     * On initialization, the masterdata ObjectHeader and the Timeline don't have any data yet, so they are set busy.
     * Once the patient config has been loaded in the component the actual data can be loaded.
     * @override
     * @protected
     */
    ContentController.prototype.onInit = function () {
        this._aDataPromises = [];

        // Listen to contentComponent's reload event (not page reload).
        this.getOwnerComponent().attachReload(function (oEvent) {
            this._sPatientId = oEvent.getParameter("patientId");

            var oStateModel = this.getView().getModel("state");
            oStateModel.setProperty("/busy/masterdata", true);
            oStateModel.setProperty("/busy/interactions", true);
            if (this._aDataPromises.length) {
                this._cancelRequests();
                this.byId("timeline").resetZoom();
            }

            var sConfigId = this.getView().getModel("meta").getData().configId;
            var sConfigVersion = this.getView().getModel("meta").getData().configVersion;
            var oState = Utils.getState(sConfigId, sConfigVersion);

            var oModel = this.getView().getModel().getData();
            oModel.lanes.forEach(function (oLane) {
                this.applyStateToLane(oLane, oState);
            }, this);
            oModel.lanes.sort(function comp(a, b) {
                return a.rank - b.rank;
            });
            this.getView().getModel().updateBindings();

            this._loadData();
        }, this);
    };

    ContentController.prototype.applyStateToLane = function (oLane, state) {
        if (state && state.hasOwnProperty("lanes") && Array.isArray(state.lanes)) {
            var aLaneStates = state.lanes.filter(function (lane) {
                // ToDo: Introduce Lane ID
                return lane.title === oLane.title;
            });
            if (aLaneStates.length > 0) {
                var oLaneState = aLaneStates[0];
                var rank = parseInt(oLaneState.rank, 10);
                if (!isNaN(rank)) {
                    oLane.rank = rank;
                }
                oLane.visible = Boolean(oLaneState.visible);
                oLane.initiallyFiltered = Boolean(oLaneState.initiallyFiltered);
                oLane.minimized = Boolean(oLaneState.minimized);

                // ToDo: Check for attributes to exist and being plottable
                if (Array.isArray(oLaneState.subLanes)) {
                    oLane.subLanes = oLaneState.subLanes;
                    oLane.subLanes.forEach(function (mSubLane) {
                        //FIXME
                        if (mSubLane.mode !== ps.app.ui.lib.ChartMode.Dot && mSubLane.mode !== ps.app.ui.lib.ChartMode.Line) {
                            mSubLane.mode = ps.app.ui.lib.ChartMode.Dot;
                        }
                    });
                }
            }
        }
    };

    /**
     * Handle selection of tabs.
     * @param {sap.ui.base.Event} oEvent IconTabBar select event
     */
    ContentController.prototype.onDetailSelect = function (oEvent) {
        this.getOwnerComponent().setTab(oEvent.getParameter("selectedKey"));
    };

    /**
     * Cancels the patient service request.
     * @private
     */
    ContentController.prototype._cancelRequests = function () {
        this.$PatientServicePromise.reject("abort");
    };

    ContentController.prototype.getUserName = function () {
        if (sap.ushell) {
            return sap.ushell.Container.getService("UserInfo").getUser().getFullName();
        } else {
            return "default";
        }
    };


    /**
     * Load the patient data from the configured patient service.
     * The loading of the interactions is done in parallel.
     * The loaded patient data is processed into the required format and set into the model as soon as it arrives.
     * @private
     */
    ContentController.prototype._loadData = function () {
        this.getOwnerComponent().notifyDataLoadStarted();

        var oNumberFormatter = NumberFormat.getFloatInstance({
            groupingEnabled: false
        });
        var oStateModel = this.getView().getModel("state");
        var oPatientModel = this.getView().getModel("patient");
        var oConfigModel = this.getView().getModel();
        var mConfig = oConfigModel.getData();
        var mConfigMetaData = this.getView().getModel("meta").getData();

        var aInteractionTypes = mConfig.lanes.reduce(function (aLaneInteractionTypes, mLane) {
            return aLaneInteractionTypes.concat(mLane.interactions.map(function (mInteraction) {
                return mInteraction.source;
            }));
        }, []).filter(function (sType, iIndex, aSelf) {
            return aSelf.indexOf(sType) === iIndex;
        });

        // Get first value of the first attribute for an annotation
        // Resolves array notation of attributes and annotations
        var fGetAttributeForAnnotation = function (mObject, mConfigObject, sAnnotation) {
            if (mConfigObject.annotations.hasOwnProperty(sAnnotation) && mConfigObject.annotations[sAnnotation].length > 0) {
                var sAttribute = mConfigObject.annotations[sAnnotation][0];
                if (mObject.attributes[sAttribute].length > 0) {
                    return mObject.attributes[sAttribute][0];
                }
                jQuery.sap.log.warning("Missing values for '" + sAnnotation + "'-annotated attribute '" + sAttribute + "'.");
            }
            jQuery.sap.log.warning("Missing values for annotation '" + sAnnotation + "'.");
            return "NoValue";
        };

        var fGetAttributeNameForAnnotation = function (mInteractionType, sAnnotation) {
            if (mInteractionType && mInteractionType.annotations) {
                var aAttributes = mInteractionType.annotations[sAnnotation];
                if (aAttributes && aAttributes.length > 0) {
                    return aAttributes[0];
                }
            }
        };
        var configId = mConfigMetaData.configId;
        var baseURL = this.getOwnerComponent().getMetadata().getConfig().patientService;
        var url = baseURL + "/" + this._sPatientId + "?configId=" + configId;
        this.$PatientServicePromise = Utils.ajax({
            url: url,
            type: "GET"
        }).done(function (mPatient) {
            oStateModel.setProperty("/error/interactions/reason", "");

            // Check if the patient exists (or is visible to the user)
            if (!mPatient || fGetAttributeForAnnotation(mPatient.masterData, mConfig.masterdata, "patient_id") !== this._sPatientId) {
                this.getOwnerComponent().notifyPatientNotFound(this._sPatientId);
                return;
            }

            // Initialize object with plot data arrays
            mPatient.plotData = {};

            // Masterdata lines formatter function
            var fFormatMasterdata = function (_, p1) {
                if (!Array.isArray(mPatient.masterData.attributes[p1])) {
                    jQuery.sap.log.error("MasterData attribute should be an array of values: " + p1, "PatientService");
                    return mPatient.masterData.attributes[p1];
                }
                return mPatient.masterData.attributes[p1].map(function (vAttributeValue) {
                    if (vAttributeValue === "NoValue") {
                        return Utils.getText("HPH_PAT_CONTENT_NO_VALUE");
                    }
                    switch (mConfig.masterdata.attributes[p1].type) {
                        case ps.app.ui.lib.CDMAttrType.Date:
                            return Utils.formatDate(Utils.parseISODate(vAttributeValue));
                        case ps.app.ui.lib.CDMAttrType.Datetime:
                            return Utils.formatDateTime(Utils.parseISODate(vAttributeValue));
                        case ps.app.ui.lib.CDMAttrType.Number:
                            return oNumberFormatter.format(vAttributeValue);
                        default:
                            return vAttributeValue;
                    }
                }).join(", ");
            };

            // Returns a functor that converts 'NoValue' into a translated string and formats the rest with up to 2 functors
            var fNoValueHandler = function (fConverter1, fConverter2) {
                var sNoValue = Utils.getText("HPH_PAT_CONTENT_NO_VALUE");
                if (fConverter1) {
                    if (fConverter2) {
                        return function (s) {
                            return s === "NoValue" ? sNoValue : fConverter2(fConverter1(s));
                        };
                    } else {
                        return function (s) {
                            return s === "NoValue" ? sNoValue : fConverter1(s);
                        };
                    }
                } else {
                    return function (s) {
                        return s === "NoValue" ? sNoValue : s;
                    };
                }
            };

            // Returns a functor to preformat attributes depending on the attribute type
            var fGetPreformatter = function (sAttributeType) {
                if (sAttributeType === ps.app.ui.lib.CDMAttrType.Date) {
                    return fNoValueHandler(Utils.parseISODate, Utils.formatDate);
                } else if (sAttributeType === ps.app.ui.lib.CDMAttrType.Datetime) {
                    return fNoValueHandler(Utils.parseISODate, Utils.formatDateTime);
                } else if (sAttributeType === ps.app.ui.lib.CDMAttrType.Number) {
                    return fNoValueHandler(oNumberFormatter.format.bind(oNumberFormatter));
                } else {
                    return fNoValueHandler();
                }
            };

            // Formats attribute using preformatted attributes and formatter string
            var fDisplayFormatter = function (oAttributes, sFormatter, sAttributeSource) {
                if (sFormatter) {
                    return sFormatter.replace(/{(\w+)}/g, function (_, sPlaceholderAttributeSource) {
                        var aValues = oAttributes[sPlaceholderAttributeSource];
                        if (Array.isArray(aValues)) {
                            return oAttributes[sPlaceholderAttributeSource].join(", ");
                        } else {
                            return typeof aValues !== "undefined" ? aValues : "?";
                        }
                    });
                } else {
                    return oAttributes[sAttributeSource];
                }
            };

            // Format masterdata texts
            mConfig.masterdata.title[0].text = mConfig.masterdata.title[0].pattern.replace(/{(\w+)}/g, fFormatMasterdata);
            mConfig.masterdata.details.forEach(function (mRow) {
                mRow.text = mRow.pattern.replace(/{(\w+)}/g, fFormatMasterdata);
            });

            // Initialize the timeline range information
            mConfig.timeline = {
                showDatelessInteractions: false
            };
            delete mConfig.masterdata.dob;
            delete mConfig.masterdata.dod;

            // Set patient dob and dod if available to be displayed on the timeline
            var dob = fGetAttributeForAnnotation(mPatient.masterData, mConfig.masterdata, "date_of_birth");
            var dod = fGetAttributeForAnnotation(mPatient.masterData, mConfig.masterdata, "date_of_death");
            if (dob !== "NoValue") {
                mConfig.masterdata.dob = Utils.parseISODate(dob);
                mConfig.timeline.min = mConfig.masterdata.dob;
            }
            if (dod !== "NoValue") {
                mConfig.masterdata.dod = Utils.parseISODate(dod);
                mConfig.timeline.max = mConfig.masterdata.dod;
            }

            mConfig.overviewInteractions = {
                dated: [],
                undated: []
            };

            mConfig.lanes.forEach(function (mLane, rank) {
                mLane.defaultRank = rank;
                mLane.rank = rank + 1000;
                if (!Array.isArray(mLane.subLanes)) {
                    mLane.subLanes = [];
                }
                mLane.tiles = {
                    dated: [],
                    undated: []
                };
                mLane.plottableAttributes = [];
                mPatient.plotData[mLane.title] = {};
                mLane.interactions.forEach(function (mInteractionType) {
                    var sAttrInteractionStart = fGetAttributeNameForAnnotation(mInteractionType, "interaction_start");
                    var sAttrInteractionEnd = fGetAttributeNameForAnnotation(mInteractionType, "interaction_end");

                    if (mInteractionType.visible) {
                        mInteractionType.attributes.forEach(function (mAttribute) {
                            if (mAttribute.plottable) {
                                mLane.plottableAttributes.push({
                                    interactionId: mInteractionType.source,
                                    interactionName: mInteractionType.name,
                                    attribute: mAttribute
                                });
                            }
                        });
                    }

                    var aInteractions = mPatient.interactionTypes[mInteractionType.source];
                    if (!Array.isArray(aInteractions)) {
                        jQuery.sap.log.error("Response did not contain requested interactionType: " + mInteractionType.source, "PatientService");
                        return;
                    }

                    aInteractions.sort(function (a, b) {
                        var aStart = a.attributes[sAttrInteractionStart];
                        var bStart = b.attributes[sAttrInteractionStart];

                        if (!Array.isArray(aStart) || aStart.length === 0) {
                            return -1;
                        }
                        if (!Array.isArray(bStart) || bStart.length === 0) {
                            return 1;
                        }

                        var aStartTime = (new Date(aStart[0])).getTime();
                        var bStartTime = (new Date(bStart[0])).getTime();

                        if (isNaN(aStartTime)) {
                            return -1;
                        }
                        if (isNaN(bStartTime)) {
                            return 1;
                        }

                        if (aStartTime === bStartTime) {
                            return 0;
                        }
                        return aStartTime < bStartTime ? -1 : 1;
                    });

                    // Create a list of annotations
                    var aAnnotationAttributes = Object.keys(mInteractionType.annotations).reduce(function (aPrevAnnotations, sAnnotation) {
                        if (sAnnotation !== "interaction_end" && sAnnotation !== "interaction_start") {
                            Array.prototype.push.apply(aPrevAnnotations, mInteractionType.annotations[sAnnotation].map(function (sAttribute) {
                                return {
                                    annotation: sAnnotation,
                                    attribute: sAttribute
                                };
                            }));
                        }
                        return aPrevAnnotations;
                    }, []);


                    // Extract plottable attributes
                    var aPlottableAttributes = mInteractionType.attributes.filter(function (oAttribute) {
                        return oAttribute.plottable;
                    });

                    var aPreformatter = mInteractionType.attributes.map(function (mAttributeType) {
                        return fGetPreformatter(mAttributeType.type);
                    });

                    // Create data objects for the plottable attributes
                    if (aPlottableAttributes.length) {
                        mPatient.plotData[mLane.title][mInteractionType.source] = aInteractions
                        .filter(function (mInteraction) {
                            var interactionStart = Utils.parseISODate(mInteraction.attributes[sAttrInteractionStart][0]);
                            var interactionEnd = Utils.parseISODate(mInteraction.attributes[sAttrInteractionEnd][0]);
                            return interactionStart && interactionEnd;
                        })
                        .map(function (mInteraction, index) {
                            // Preformat all interaction attributes
                            var mAttributes = mInteractionType.attributes.reduce(function (mPrev, mAttributeType, i) {
                                if (mInteraction.attributes.hasOwnProperty(mAttributeType.id)) {
                                    mPrev[mAttributeType.id] = mInteraction.attributes[mAttributeType.id].map(aPreformatter[i]);
                                }
                                return mPrev;
                            }, {});

                            return aPlottableAttributes.reduce(function (oPrevData, mAttributeType) {
                                oPrevData[mAttributeType.id] = mInteraction.attributes[mAttributeType.id][0];
                                oPrevData["$" + mAttributeType.id] = fDisplayFormatter(mAttributes, mAttributeType.formatter ? mAttributeType.formatter.pattern : "{" + mAttributeType.id + "}", mAttributeType.id);
                                return oPrevData;
                            }, {
                                _startDate: Utils.utcToLocal(Utils.parseISODate(mInteraction.attributes[sAttrInteractionStart][0])),
                                _id: index
                            });
                        });
                    }

                    aInteractions.forEach(function (mInteraction) {
                        var interactionStart = Utils.parseISODate(mInteraction.attributes[sAttrInteractionStart][0]);
                        var interactionEnd = Utils.parseISODate(mInteraction.attributes[sAttrInteractionEnd][0]);
                        var aAnnotations = aAnnotationAttributes.map(function (o) {
                            return {
                                annotation: o.annotation,
                                values: mInteraction.attributes[o.attribute]
                            };
                        });

                        var mTile = {
                            name: mInteractionType.name,
                            start: interactionStart,
                            end: interactionEnd,
                            annotations: aAnnotations,
                            attributes: []
                        };
                        var mOverviewEntry = {
                            name: mInteractionType.name,
                            groupName: mLane.title,
                            color: mLane.color,
                            start: interactionStart,
                            end: interactionEnd,
                            annotations: aAnnotations,
                            attributes: []
                        };

                        var aAttributes;
                        // If the interaction accepts all attributes, just add them
                        if (mInteractionType.allowUndefinedAttributes) {
                            // Don't show attributes with interaction_start or interaction_end annotation
                            var aDisallowedAttributes = mInteractionType.annotations.interaction_start.concat(mInteractionType.annotations.interaction_end);
                            aAttributes = Object.keys(mInteraction.attributes)
                                .filter(function (sAttributeKey) {
                                    return aDisallowedAttributes.indexOf(sAttributeKey) === -1;
                                })
                                .map(function (sAttributeKey) {
                                    return {
                                        name: sAttributeKey,
                                        values: mInteraction.attributes[sAttributeKey]
                                    };
                                });
                        } else {
                            // Otherwise only add selected attributes and format them based on configuration

                            // Preformat all interaction attributes
                            var mAttributes = mInteractionType.attributes.reduce(function (mPrev, mAttributeType, i) {
                                mPrev[mAttributeType.id] = mInteraction.attributes[mAttributeType.id].map(aPreformatter[i]);
                                return mPrev;
                            }, {});

                            // Prepare list of attributes
                            aAttributes = mInteractionType.attributes
                                .filter(function (mAttributeType) {
                                    return mAttributeType.visible;
                                })
                                .map(function (mAttributeType) {
                                    var mAttribute = {
                                        name: mAttributeType.name,
                                        values: [fDisplayFormatter(mAttributes, mAttributeType.formatter ? mAttributeType.formatter.pattern : "{" + mAttributeType.id + "}", mAttributeType.id)]
                                    };
                                    if (mAttributeType.firstTileAttribute || mAttributeType.secondTileAttribute) {
                                        mAttribute.main = true;
                                        mAttribute.mainOrder = mAttributeType.firstTileAttribute ? 1 : 2;
                                    }
                                    return mAttribute;
                                });
                        }
                        mTile.attributes = aAttributes;
                        mTile.key = mLane.tiles.dated.length;
                        mOverviewEntry.attributes = aAttributes;

                        // group timeline and overview entries in dated/dateless interactions
                        if (mOverviewEntry.start && interactionEnd) {
                            mLane.tiles.dated.push(mTile);
                            mConfig.overviewInteractions.dated.push(mOverviewEntry);
                        } else {
                            mLane.tiles.undated.push(mTile);
                            mConfig.overviewInteractions.undated.push(mOverviewEntry);
                        }

                        // update global min and max date of the timeline
                        if (mTile.start && (!mConfig.timeline.min || mTile.start < mConfig.timeline.min)) {
                            mConfig.timeline.min = new Date(mTile.start.getTime()); // Copy the date object
                        }
                        if (mTile.end && (!mConfig.timeline.max || mTile.end > mConfig.timeline.max)) {
                            mConfig.timeline.max = new Date(mTile.end.getTime()); // Copy the date object
                        }
                    });
                });
                // update total lane tile count
                mLane.tileCount = mLane.tiles.dated.length + mLane.tiles.undated.length;

                // update show-dateless-interactions flag
                mConfig.timeline.showDatelessInteractions = mConfig.timeline.showDatelessInteractions || mLane.tiles.undated.length !== 0;

                // Sort tiles by their start date (for the clustering and clustered tiles popover)
                if (mLane.interactions.length > 1) {
                    // As interactions of the same type are sorted already
                    // We need to sort only for more than one interaction type
                    mLane.tiles.dated.sort(function (oTileA, oTileB) {
                        return oTileA.start - oTileB.start;
                    });
                }
            });

            // In case the timeline is empty, that dates will not have been set.
            // Use today +/- one year (365 days technically)
            if (!mConfig.timeline.min && !mConfig.timeline.max) {
                mConfig.timeline.min = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
                mConfig.timeline.max = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            } else if (!mConfig.timeline.min !== !mConfig.timeline.max) {
                // XOR: if only one is not set, set both to the same
                mConfig.timeline.min = mConfig.timeline.min || mConfig.timeline.max;
                mConfig.timeline.max = mConfig.timeline.min || mConfig.timeline.max;
            }

            // In case the range is to small, increase it in order for the patient summary scale to work properly
            // I.e. if there is only one event (interaction or dob/dod) there would be no range
            // The minimal time range is two days and centered on the average of min and max
            var iMinRange = 2 * 24 * 60 * 60 * 1000; // two days in milliseconds
            var iActualRange = mConfig.timeline.max.getTime() - mConfig.timeline.min.getTime();
            if (iActualRange < iMinRange) {
                mConfig.timeline.min = new Date(mConfig.timeline.min.getTime() - (iMinRange - iActualRange) / 2);
                mConfig.timeline.max = new Date(mConfig.timeline.max.getTime() + (iMinRange - iActualRange) / 2);
            }

            this.filterOverviewInteractions();
            oPatientModel.setData(mPatient);
            oConfigModel.setData(mConfig);
            this.getOwnerComponent().notifyDataLoadFinished();
        }.bind(this)).fail(function ($jqXHR, sTextStatus, sErrorThrown) {
            if (sTextStatus !== "abort") {
                jQuery.sap.log.error("PatientService request failed", sErrorThrown, "@Timeline Content.controller");
            }
            if ($jqXHR && $jqXHR.responseJSON && $jqXHR.responseJSON.logId) {
                oStateModel.setProperty("/error/interactions/reason", Utils.getText("HPH_PAT_CONTENT_DB_LOGGED_MESSAGE", [$jqXHR.responseJSON.logId]));
            }
            this.getOwnerComponent().notifyPatientNotFound(this._sPatientId);
        }.bind(this)).always(function () {
            oStateModel.setProperty("/busy/masterdata", false);
            oStateModel.setProperty("/busy/interactions", false);
        });
    };

    /**
     * Filters the overview interactions.
     * The visible interactions are defined by the OverviewButtons and the config.
     */
    ContentController.prototype.filterOverviewInteractions = function () {
        var aFilters = [];
        this.getView().getModel().getProperty("/lanes").forEach(function (mLane) {
            if (!mLane.initiallyFiltered) {
                aFilters.push(new Filter({
                    path: "groupName",
                    operator: sap.ui.model.FilterOperator.NE,
                    value1: mLane.title
                }));
            }
        });
        ["overviewListUndated", "overviewListDated"].forEach(function (sId) {
            if (this.byId(sId)) {
                var oListBinding = this.byId(sId).getBinding("items");
                if (aFilters.length) {
                    oListBinding.filter(new Filter({
                        filters: aFilters,
                        and: true
                    }), sap.ui.model.FilterType.Application);
                } else {
                    oListBinding.filter();
                }
            }
        }, this);
        ["overviewPanelUndated", "overviewPanelDated"].forEach(function (sId) {
            var oPanel = this.byId(sId);
            if (oPanel) {
                oPanel.getBinding("headerText").refresh(true);
            }
        }, this);
    };

    ContentController.prototype.formatTextWithLengthPlaceholder = function (sKey, aInteractions, aLanes) {
        var nLength = 0;

        if (Array.isArray(aInteractions) && aInteractions.length) {
            var aTitles = aLanes.filter(function (mLane) {
                return mLane.initiallyFiltered;
            }).map(function (mLane) {
                return mLane.title;
            });
            nLength = aInteractions.filter(function (mInteraction) {
                return aTitles.indexOf(mInteraction.groupName) !== -1;
            }).length;
        }
        return Utils.getText(sKey, [nLength]);
    };

    ContentController.prototype.formatText = function (sText) {
        return jQuery.sap.formatMessage(sText, Array.prototype.slice.call(arguments, 1));
    };

    /**
     * Factory function to create TileAnnotations.
     * Creates TileAnnotations and adds Controls from extensions.
     * @private
     * @param   {string}               sId       Id of the new control
     * @param   {sap.ui.model.Context} oContext  BindingContext of the control
     * @param   {string}               sFunction Name of the function to get the extension controls
     * @returns {ps.app.ui.lib.TileAnnotation} New TileAnnotation control.
     */
    ContentController.prototype._createAnnotations = function (sId, oContext, sFunction) {
        var sAnnotation = oContext.getProperty("annotation");
        var aValues = oContext.getProperty("values");
        return new TileAnnotation(sId, {
            name: sAnnotation,
            values: aValues,
            controls: this.getOwnerComponent().getExtensions(sAnnotation).reduce(function (aControls, mExtension) {
                var aExtensionControls;
                try {
                    aExtensionControls = mExtension.controller[sFunction](sAnnotation, aValues);
                } catch (oError) {
                    jQuery.sap.log.error("Patient Summary Extension \"" + mExtension.id + "\" threw an exception on " + sFunction + ": " + oError.message);
                }
                if (aExtensionControls && Array.isArray(aExtensionControls)) {
                    aExtensionControls.forEach(function (oControl) {
                        if (oControl instanceof sap.ui.core.Control) {
                            aControls.push(oControl);
                        }
                    });
                }
                return aControls;
            }, [])
        });
    };

    ContentController.prototype.isEmpty = function (plottableAttributes) {
        return Array.isArray(plottableAttributes) && plottableAttributes.length === 0;
    };
    ContentController.prototype.isNotEmpty = function (plottableAttributes) {
        return Array.isArray(plottableAttributes) && plottableAttributes.length > 0;
    };
    ContentController.prototype.isNotEmptyAndNotHidden = function (plottableAttributes, bHidden) {
        return Array.isArray(plottableAttributes) && plottableAttributes.length > 0 && !bHidden;
    };
    ContentController.prototype.hasNotPlottedAttributes = function (subLaneCount, plottableAttributeCount) {
        return typeof subLaneCount !== "undefined" &&
               typeof plottableAttributeCount !== "undefined" &&
               subLaneCount < plottableAttributeCount;
    };

    ContentController.prototype.addChartTooltipFormatter = function (subLaneCount, plottableAttributeCount) {
        if (this.hasNotPlottedAttributes(subLaneCount, plottableAttributeCount)) {
            return Utils.getText("HPH_PAT_CONTENT_ADD_CHART_TOOLTIP");
        } else {
            return Utils.getText("HPH_PAT_CONTENT_ADD_CHART_NON_LEFT_TOOLTIP");
        }
    };

    ContentController.prototype.createLane = function (sId, oContext) {
        var oLaneData = oContext.getObject();

        // FIXME: why do we need to escape it at all?
        oLaneData.formatter = typeof oLaneData.formatter === "string" ?
            oLaneData.formatter.replace(/{(\d+)}/g, function (a, b) {
                return "\\{" + b + "\\}";
            }) : oLaneData.formatter;

        if (oLaneData.laneType === "ChartLane") {
            var aPath = oContext.getPath().split("/");
            aPath.splice(-2);
            var sLaneName = oContext.getProperty(aPath.join("/") + "/title");
            var oChart = sap.ui.xmlfragment("ps.app.ui.view.Chart", this);
            oChart.bindProperty("data", {path: "patient>/plotData/" + sLaneName + "/" + oContext.getProperty("interactionId")});
            return oChart;
        } else {
            if (oLaneData.laneType !== "InteractionLane") {
                jQuery.sap.log.error("Unknown lane type:", oLaneData.laneType);
            }
            return sap.ui.xmlfragment("ps.app.ui.view.Lane", this);
        }
    };

    ContentController.prototype.handleDatapointClick = function (oEvent) {
        var oChart = oEvent.getSource();
        var oLane = oChart.getLane();
        var oChartData = oChart.getBindingContext().getObject();
        var oLaneData = oLane.getBindingContext().getObject();
        var mInteractionTypes = this.getView().getModel("patient").getProperty("/interactionTypes");

        var aInteractions = oLaneData.interactions;
        var oDatapoint = oEvent.getParameter("datapoint");
        var nTileIndex = oDatapoint._id;

        // compute offset in tiles array
        for (var i = 0; i < aInteractions.length; i++) {
            if (aInteractions[i].source === oChartData.interactionId) {
                break;
            }
            nTileIndex += mInteractionTypes[aInteractions[i].source].length;
        }

        var sTileIndex = String(nTileIndex);
        var aTiles = oLane.getTiles().filter(function (oTile) {
            return oTile.getKey() === sTileIndex;
        });
        if (aTiles.length) {
            var oCircleDOM = oEvent.getParameter("d3Event").target;
            var oHook = d3.select(oCircleDOM.parentNode).select(".sapTlTimelineChartDotHook");
            var oPopover = aTiles[0].openTilePopover(oHook[0][0], aTiles);
            oChart.lockPoint(oDatapoint);
            // Attach a on-after-close handler to remove the point from the list of anchors we need to keep in the SVG
            oPopover.attachEventOnce("afterClose", function () {
                oChart.unlockPoint(oDatapoint);
            });
        }
    };

    ContentController.prototype.handleUndatedBadgeClick = function (oEvent) {
        var oButton = oEvent.getSource();
        if (!this.undatedTilesPopover) {
            this.undatedTilesPopover = sap.ui.xmlfragment("ps.app.ui.view.UndatedTilesPopover", this);
            this.getView().addDependent(this.undatedTilesPopover);
        }
        this.undatedTilesPopover.bindElement(oButton.getBindingContext().getPath());
        this.undatedTilesPopover.openBy(oButton);
    };

    ContentController.prototype.onOpenChartVisualizationDialog = function (oEvent) {
        var oSource = oEvent.getSource();
        var sBindingPath = oSource.getBindingContext().getPath();

        if (!this.chartSelectionDialog) {
            this.chartSelectionDialog = sap.ui.xmlfragment("ps.app.ui.view.ChartSelection", this);
            this.getView().addDependent(this.chartSelectionDialog);
        }
        this.chartSelectionDialog.bindElement(sBindingPath);
        this.chartSelectionDialog.openBy(oSource);
    };

    ContentController.prototype.onOpenAddChartDialog = function (oEvent) {
        var oSource = oEvent.getSource();
        var sBindingPath = oSource.getBindingContext().getPath();

        if (!this.attributeSelectionDialog) {
            this.attributeSelectionDialog = sap.ui.xmlfragment("ps.app.ui.view.AttributeSelection", this);
            this.getView().addDependent(this.attributeSelectionDialog);
        }
        this.attributeSelectionDialog.bindElement(sBindingPath);
        this.attributeSelectionDialog.getContent()[0].removeSelections(true);
        this.attributeSelectionDialog.getSubHeader().getContent()[0].setValue();
        this.attributeSelectionDialog.getSubHeader().getContent()[0].fireLiveChange();
        this.attributeSelectionDialog.openBy(oSource);
        this.attributeSelectionDialog.$().find("input").attr("autocomplete", "off");
    };

    ContentController.prototype.addChartLane = function (oContext) {
        var oAttribute = oContext.getObject();
        var aPath = oContext.getPath().split("/");

        // remove "plottable/<index>" suffix from path and get lane
        aPath.splice(-2, 2);
        var oLane = oContext.getModel().getProperty(aPath.join("/"));

        // create sublane array if necessary
        var sPath = aPath.join("/") + "/subLanes";
        if (!oLane.subLanes) {
            oContext.getModel().setProperty(sPath, []);
        }

        // add a new chart lane at the end of the lane's sublanes
        var sSublanePath = aPath.join("/") + "/subLanes/" + oLane.subLanes.length;

        oContext.getModel().setProperty(sSublanePath, {
            laneType: "ChartLane",
            title: oAttribute.attribute.name,
            mode: ps.app.ui.lib.ChartMode.Dot,
            color: oLane.color,
            interactionId: oAttribute.interactionId,
            valueColumn: oAttribute.attribute.id,
            plottableAttributes: []
        });
    };

    ContentController.prototype.onRemoveLane = function (oEvent) {
        var oButton = oEvent.getSource();
        var oContext = oButton.getBindingContext();
        var aPath = oContext.getPath().split("/");
        var iLaneIndex = parseInt(aPath.pop(), 10);

        // remove lane from array
        oContext.getProperty(aPath.join("/")).splice(iLaneIndex, 1);
        oContext.getModel().updateBindings();
    };

    ContentController.prototype.onToggleMinimized = function (oEvent) {
        var oButton = oEvent.getSource();
        var oContext = oButton.getBindingContext();

        // toggle minimized boolean
        oContext.getModel().setProperty("minimized", !oContext.getProperty("minimized"), oContext);
    };

    ContentController.prototype.onChartAttributeSelected = function (oEvent) {
        var oSource = oEvent.getSource();
        this.addChartLane(oSource.getSelectedContexts()[0]);
        this.attributeSelectionDialog.close();
    };

    ContentController.prototype.onChartAttributeSearch = function (oEvent) {
        var listItems = this.attributeSelectionDialog.getContent()[0].getVisibleItems();
        var attributeListItems = listItems.filter(function (e) {
            return e.getMode() === "SingleSelectMaster";
        });
        // This is the only way to distinguish an enter-press in an empty search field from pressing the X-button
        if (oEvent.getParameter("refreshButtonPressed") === false) {
            if (attributeListItems.length > 0) {
                this.addChartLane(attributeListItems[0].getBindingContext());
                this.attributeSelectionDialog.close();
            }
        }
    };

    ContentController.prototype.onChartAttributeLiveChange = function (oEvt) {
        var oSource = oEvt.getSource();
        var sBindingPath = oSource.getBindingContext().getPath();
        var oModel = oSource.getModel();

        // add filter for search
        var aFilters = [];
        var sQuery = oEvt.getSource().getValue();
        if (sQuery && sQuery.length > 0) {
            var filter = new Filter("attribute/name", sap.ui.model.FilterOperator.Contains, sQuery);
            aFilters.push(filter);
        }

        // add filter for not used

        var subLanes = oModel.getProperty(sBindingPath + "/subLanes") || [];

        var notPlottedFilter = new Filter("", function (oValue) {
            function matchingSubLane(oLane) {
                return oLane.interactionId === oValue.interactionId &&
                       oLane.valueColumn === oValue.attribute.id;
            }
            return subLanes.filter(matchingSubLane).length === 0;
        });
        aFilters.push(notPlottedFilter);

        // update list binding
        var list = this.attributeSelectionDialog.getContent()[0];
        var binding = list.getBinding("items");
        binding.filter([new Filter({
            filters: aFilters,
            and: true
        })], "Application");
    };

    ContentController.prototype.getAttributeSelectionGroupHeader = function (oGroup) {
        return new GroupHeaderListItem({
            title: oGroup.key,
            upperCase: false
        });
    };

    ContentController.prototype.resetSettings = function () {
        var aLanes = this.getView().getModel().getProperty("/lanes");
        aLanes.forEach(function (oLane) {
            oLane.visible = true;
            oLane.initiallyFiltered = Array.isArray(oLane.tiles.dated) && oLane.tiles.dated.length > 0;
            oLane.minimized = false;
            oLane.subLanes = [];
            oLane.rank = oLane.defaultRank;
        });
        aLanes.sort(function comp(a, b) {
            return a.rank - b.rank;
        });
        this.getView().getModel().updateBindings();
        this.filterOverviewInteractions();
    };

    ContentController.prototype.onExit = function () {
        if (this.attributeSelectionDialog) {
            this.attributeSelectionDialog.destroy();
        }
        if (this.chartSelectionDialog) {
            this.chartSelectionDialog.destroy();
        }
        var oMetaModel = this.getView().getModel("meta");
        // If there is no meta model, no config has been selected before closing.
        // Therefore the application did not open and no user state needs to be saved.
        if (oMetaModel) {
            var configId = oMetaModel.getProperty("/configId");
            var configVersion = oMetaModel.getProperty("/configVersion");

            var lanes = this.getView().getModel().getProperty("/lanes");
            var state = {
                lanes: lanes.map(function (oLane) {
                    return {
                        initiallyFiltered: oLane.initiallyFiltered,
                        minimized: oLane.minimized,
                        rank: oLane.rank,
                        subLanes: oLane.subLanes,
                        title: oLane.title,
                        visible: oLane.visible
                    };
                })
            };

            Utils.setState(configId, configVersion, state);
        }
    };

    /**
     * Factory function to create TileAnnotations for the Timeline.
     * Creates TileAnnotations and adds Controls from extensions.
     * @private
     * @param   {string}               sId       Id of the new control
     * @param   {sap.ui.model.Context} oContext  BindingContext of the control
     * @returns {ps.app.ui.lib.TileAnnotation} New TileAnnotation control.
     */
    ContentController.prototype.createTimelineAnnotations = function (sId, oContext) {
        return this._createAnnotations(sId, oContext, "getTimelineControls");
    };

    /**
     * Factory function to create TileAnnotations for the Overview.
     * Creates TileAnnotations and adds Controls from extensions.
     * @private
     * @param   {string}               sId       Id of the new control
     * @param   {sap.ui.model.Context} oContext  BindingContext of the control
     * @returns {ps.app.ui.lib.TileAnnotation} New TileAnnotation control.
     */
    ContentController.prototype.createOverviewAnnotations = function (sId, oContext) {
        return this._createAnnotations(sId, oContext, "getOverviewControls");
    };

    /**
     * Check if the tab belonging to the selected key is configured to be visible.
     * If not, the default tab will be returned.
     * @param   {string} sTab               Key of the selected tab
     * @param   {object} mSummaryTabOptions Object of tab options
     * @returns {string} The selected key if visible or "timeline"
     */
    ContentController.prototype.checkSelectedKey = function (sTab, mSummaryTabOptions) {
        if (mSummaryTabOptions[sTab] && mSummaryTabOptions[sTab].visible === false) {
            return this.getOwnerComponent().Default;
        }
        return sTab;
    };

    return ContentController;
});
