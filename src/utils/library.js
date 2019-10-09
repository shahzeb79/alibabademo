sap.ui.define([
    "jquery.sap.global",
    "sap/m/library",
    "sap/ui/core/library"
], function () {
    "use strict";

    sap.ui.getCore().setThemeRoot("sap_bluecrystal", ["ps.app.ui.utils"], "");

    /**
     * SAPUI5 library for FFH Core.
     *
     * @namespace
     * @name ps.app.ui.utils
     */
    sap.ui.getCore().initLibrary({
        name: "ps.app.ui.utils",
        version: "1.0.0",
        dependencies: [
            "sap.m",
            "sap.ui.core"
        ],
        types: [
            "ps.app.ui.utils.FioriUtils.DensityClass"
        ],
        interfaces: [],
        elements: [
            "ps.app.ui.utils.AjaxUtils",
            "ps.app.ui.utils.DateUtils",
            "ps.app.ui.utils.FioriUtils",
            "ps.app.ui.utils.JSONUtils",
            "ps.app.ui.utils.ScopedUtils",
            "ps.app.ui.utils.TextUtils",
            "ps.app.ui.utils.UserPrefsUtils",
            "ps.app.ui.utils.Utils"
        ]
    });

    return ps.app.ui.utils;
});
