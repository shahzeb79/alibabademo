sap.ui.define([
    "ps/specs/integration/Common",
    "ps/specs/integration/matchers/MainPageMatchers",
    "sap/ui/test/Opa5"
], function ContentPage(Common, MainPageMatchers, Opa5) {
    "use strict";

    Opa5.createPageObjects({
        onTheMainPage: {
            baseClass: Common,
            actions: {
                iSetTheTabTo: function (sTabKey) {
                    return this.waitFor({
                        id: "patientIconTabBar",
                        viewName: "Content",
                        success: function (oIconTabBar) {
                            oIconTabBar.setSelectedKey(sTabKey);
                            oIconTabBar.fireSelect({
                                selectedKey: sTabKey
                            });
                        }
                    });
                }
            },
            assertions: {
                iShouldSeeTheIconTabBar: function () {
                    return this.waitFor({
                        id: "patientIconTabBar",
                        viewName: "Content",
                        success: function (oIconTabBar) {
                            assert.ok(oIconTabBar, "Found the IconTabBar");
                        },
                        errorMessage: "Can't see the IconTabBar."
                    });
                },

                iShouldSeeTheTab: function (sExpectedTabName) {
                    return this.waitFor({
                        controlType: "sap.m.IconTabFilter",
                        viewName: "Content",
                        matchers: function (oControl) {
                            var sText = oControl.getText();
                            return sText.substring(0, sExpectedTabName.length) === sExpectedTabName;
                        },
                        success: function (aIconTabFilters) {
                            aIconTabFilters.forEach(function (element, index, array) {
                                var sCurrentText = element.getText();
                                assert.strictEqual(sCurrentText, sExpectedTabName, "Icon Tab name \"" + sExpectedTabName + "\" was found");
                            });
                        },
                        error: function (oError) {
                          assert.ok(false, "Cannot find the icon tab name: " + sExpectedTabName);
                        }
                    });
                },

                iShouldSeeTheSelectedTab: function (sTabKey) {
                    return this.waitFor({
                        id: "patientIconTabBar",
                        viewName: "Content",
                        success: function (oIconTabBar) {
                            assert.equal(oIconTabBar.getSelectedKey(), sTabKey, "On the correct tab");
                        },
                        errorMessage: "On the wrong tab."
                    });
                },

                iShouldSeeThePatientHeader: function (sExpectedHeader) {
                    return this.waitFor({
                        id: "patientHeader",
                        viewName: "Content",
                        matchers: function (oControl) {
                            // Wait for header to be set
                            var sText = oControl.getTitle();
                            return sText !== "";
                        },
                        success: function (oPatientHeader) {
                            assert.equal(oPatientHeader.getTitle(), sExpectedHeader, "Header has the correct text");
                        },
                        errorMessage: "Header not found"
                    });
                },
                iShouldSeeThePatientSubHeaders: function (aExpectedSubHeaders) {
                    return this.waitFor({
                        id: "patientHeader",
                        viewName: "Content",
                        matchers: function (oControl) {
                            // Wait for header to be set
                            var sText = oControl.getTitle();
                            return sText !== "";
                        },
                        success: function (oPatientHeader) {
                            var aSubHeaders = oPatientHeader.getAttributes();
                            assert.equal(aSubHeaders.length, aExpectedSubHeaders.length, "has the correct number of subheader");
                            aSubHeaders.forEach(function (oSubHeader, iIndex) {
                                assert.equal(oSubHeader.getText(), aExpectedSubHeaders[iIndex], "Subheader " + iIndex + " has the correct text");
                            });
                        },
                        errorMessage: "Header not found"
                    });
                },
                iShouldSeeAToggleForLane: function (sLaneName, iInterCount) {
                    return this.waitFor({
                        viewName: "Content",
                        matchers: [
                            MainPageMatchers.isLaneToggleButton,
                            MainPageMatchers.propertyStartsWith("text", sLaneName),
                            MainPageMatchers.isPopulatedLaneToggleButton
                        ],
                        success: function (aToggleButtons) {
                            aToggleButtons.forEach(function (oLaneButton) {
                                assert.ok(oLaneButton, "Lane toggle button found for " + sLaneName);
                                var expectedText = sLaneName + " (" + iInterCount + ")";
                                assert.equal(oLaneButton.getText(), expectedText, "Toggle button shows correct text for " + sLaneName);
                            });
                        },
                        errorMessage: "Lane toggle button not found"
                    });
                },
                iShouldSeeALane: function (sLaneName) {
                    return this.waitFor({
                        viewName: "Content",
                        matchers: [
                            MainPageMatchers.isLaneControl,
                            MainPageMatchers.propertyStartsWith("title", sLaneName)
                        ],
                        success: function (aLanes) {
                            aLanes.forEach(function (oLane) {
                                assert.equal(oLane.getTitle(), sLaneName, "Lane found for " + sLaneName);
                            });
                        },
                        errorMessage: "Lane not found"
                    });
                },
                iShouldSeeACollapsedLane: function (sLaneName) {
                    return this.waitFor({
                        viewName: "Content",
                        matchers: [
                            MainPageMatchers.isLaneControl,
                            MainPageMatchers.isMinimizedLane,
                            MainPageMatchers.propertyStartsWith("title", sLaneName)
                        ],
                        success: function (aLanes) {
                            aLanes.forEach(function (oLane) {
                                assert.equal(oLane.getTitle(), sLaneName, "Collapsed lane '" + sLaneName + "' found.");
                            });
                        },
                        errorMessage: "No collapsed lane not found"
                    });
                },
                iShouldSeeANonCollapsedLane: function (sLaneName) {
                    return this.waitFor({
                        viewName: "Content",
                        matchers: [
                            MainPageMatchers.isLaneControl,
                            MainPageMatchers.isNonMinimizedLane,
                            MainPageMatchers.propertyStartsWith("title", sLaneName)
                        ],
                        success: function (aLanes) {
                            aLanes.forEach(function (oLane) {
                                assert.equal(oLane.getTitle(), sLaneName, "Non-collapsed lane '" + sLaneName + "' found.");
                            });
                        },
                        errorMessage: "No non-collapsed lane found"
                    });
                },
                iShouldSeeTheInteractionCountOnTheLane: function (sLaneName, iInterCount) {
                    return this.waitFor({
                        viewName: "Content",
                        matchers: [
                            MainPageMatchers.isLaneControl,
                            MainPageMatchers.isNonMinimizedLane,
                            MainPageMatchers.propertyStartsWith("title", sLaneName),
                            MainPageMatchers.propertyGreaterThan("value", 0)
                        ],
                        success: function (aLanes) {
                            aLanes.forEach(function (oLane) {
                                assert.equal(oLane.getValue(), iInterCount, "Correct tile count displayed on lane '" + sLaneName + "'.");
                            });
                        },
                        errorMessage: "Lane not found"
                    });
                },
                iShouldHaveTheInteractionsAssignedToTheLane: function (sLaneName, aIDs) {
                    var aAvailableIDs = JSON.parse(JSON.stringify(aIDs));
                    return this.waitFor({
                        viewName: "Content",
                        matchers: [
                            MainPageMatchers.isLaneControl,
                            MainPageMatchers.propertyStartsWith("title", sLaneName),
                            // use interaction count to check if data is loaded.
                            MainPageMatchers.propertyGreaterThan("value", 0)
                        ],
                        success: function (aLanes) {
                            assert.equal(aLanes.length, 1, "One lane is matching");
                            var aTiles = aLanes[0].getTiles();
                            assert.equal(aTiles.length, aIDs.length, "The correct number of tiles is assigned to the lane");
                            aTiles.forEach(function (oTile) {
                                var aAttributes = oTile.getAttributes();
                                var aInterAttr = aAttributes.filter(function (oAttr) {
                                    return oAttr.name === "Interaction ID";
                                });
                                assert.equal(aInterAttr.length, 1, "Expect interaction to have an ID");
                                var sInterId = aInterAttr[0].values[0];
                                var iInterId = parseInt(sInterId, 10);
                                var iIDIndex = aAvailableIDs.indexOf(iInterId);
                                assert.ok(iIDIndex >= 0, "Interaction ID " + iInterId + " found on '" + sLaneName + "'.");

                                // remove the entry to avoid matching the same entry multiple times.
                                aAvailableIDs.splice(iIDIndex, 1);
                            });
                        },
                        errorMessage: "Lane not found"
                    });
                },
                iShouldHaveDatelessInteractionsInUndatedModelSection: function (sLaneName, aIDs) {
                    var aAvailableIDs = JSON.parse(JSON.stringify(aIDs));
                    return this.waitFor({
                        viewName: "Content",
                        matchers: [
                            MainPageMatchers.isLaneControl,
                            MainPageMatchers.propertyStartsWith("title", sLaneName),
                            // use interaction count to check if data is loaded.
                            MainPageMatchers.propertyGreaterThan("value", 0)
                        ],
                        success: function (aLanes) {
                            assert.equal(aLanes.length, 1, "One lane is matching");
                            var oBindingContext = aLanes[0].getBindingContext();
                            var oModel = aLanes[0].getModel();
                            var aUndated = oModel.getProperty("tiles/undated", oBindingContext);
                            assert.equal(aUndated.length, aIDs.length, "The correct number of undated tiles is assigned to the lane");
                            aUndated.forEach(function (oTile) {
                                var aInterAttr = oTile.attributes.filter(function (oAttr) {
                                    return oAttr.name === "Interaction ID";
                                });
                                assert.equal(aInterAttr.length, 1, "Expect interaction to have an ID");
                                var sInterId = aInterAttr[0].values[0];
                                var iInterId = parseInt(sInterId, 10);
                                var iIDIndex = aAvailableIDs.indexOf(iInterId);
                                assert.ok(iIDIndex >= 0, "Interaction ID " + iInterId + " found on '" + sLaneName + "'.");

                                // remove the entry to avoid matching the same entry multiple times.
                                aAvailableIDs.splice(iIDIndex, 1);
                            });
                        },
                        errorMessage: "Lane not found"
                    });
                }
            }
        }
    });
});
