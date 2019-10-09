sap.ui.define([
    "sap/ui/core/Element"
], function (Element) {
    "use strict";

    var ChartLabel = Element.extend("ps.app.ui.lib.ChartLabel", {
        metadata: {
            library: "ps.app.ui.lib",
            properties: {
                /**
                 * Label Text to be displayed
                 */
                text: {
                    type: "string",
                    group: "Misc",
                    defaultValue: null
                }
            }
        }
    });

    return ChartLabel;
});
