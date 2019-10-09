sap.ui.define([
], function () {
    "use strict";
    var MainPageMatchers = {
        isLaneControl: function (oControl) {
            return oControl.$() && oControl.$().hasClass("sapTlTimelineLaneFamily");
        },
        isMinimizedLane: function (oControl) {
            return oControl.$().find(".sapTlTimelineLaneMinimized").length > 0;
        },
        isNonMinimizedLane: function (oControl) {
            return oControl.$().find(".sapTlTimelineLaneMinimized").length === 0;
        },
        isLaneToggleButton: function (oControl) {
            return oControl.$() && oControl.$().hasClass("sapTlOverviewButton");
        },
        isPopulatedLaneToggleButton: function (oControl) {
            return /\(\d+\)$/.test(oControl.getText());
        },
        propertyStartsWith: function (property, sLaneName) {
            return function (oControl) {
                var value = oControl.getProperty(property);
                return typeof value === "string" && value.indexOf(sLaneName) === 0;
            };
        },
        propertyGreaterThan: function (property, threshold) {
            return function (oControl) {
                var value = oControl.getProperty(property);
                if (typeof value === "string" && /^\d+$/.test(value)) {
                    return parseInt(value, 10) > threshold;
                } else if (typeof value === "number") {
                    return value > threshold;
                }
                return false;
            };
        }
    };
    return MainPageMatchers;
});
