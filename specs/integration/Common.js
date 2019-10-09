sap.ui.define([
    "sap/ui/test/Opa5"
], function (Opa5) {
    "use strict";

    return Opa5.extend("src.specs.integration.Common", {

        iStartMyApp: function (pid) {
            if (typeof pid === "undefined") {
                pid = "1";
            }
            this.iStartMyAppInAFrame("../../demo/index.html?pid=" + pid);
        },

        iLookAtTheScreen: function () {
            return this;
        }
    });
});
