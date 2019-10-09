sap.ui.define([
    "jquery.sap.global",
    "ps/app/ui/extension/TabExtensionBase"
], function (jQuery, TabExtensionBase) {
    "use strict";

    var TabExtension = TabExtensionBase.extend("correct.TabExtension");

    TabExtension.prototype.getContent = function () {
        return [];
    };

    TabExtension.prototype.getText = function () {
        return "Text";
    };

    return TabExtension;
});
