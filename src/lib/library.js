/**
 * SAPUI5 library for Patient Summary controls.
 *
 * @namespace
 * @name ps.app.ui.lib
 */
sap.ui.define([
    "jquery.sap.global",
    "sap/m/library",
    "sap/ui/core/library"
], function () {
    "use strict";

    sap.ui.getCore().setThemeRoot("sap_bluecrystal", ["ps.app.ui.lib"], "");
    sap.ui.getCore().setThemeRoot("sap_hcb", ["ps.app.ui.lib"], "");

    sap.ui.getCore().initLibrary({
        name: "ps.app.ui.lib",
        version: "1.0.0",
        dependencies: [
            "sap.m",
            "sap.ui.core"
        ],
        types: [
            "ps.app.ui.lib.LaneColor",
            "ps.app.ui.lib.CDMAttrType"
        ],
        interfaces: [],
        controls: [
            "ps.app.ui.lib.ConfigDialog",
            "ps.app.ui.lib.Lane",
            "ps.app.ui.lib.OverviewButton",
            "ps.app.ui.lib.OverviewListItem",
            "ps.app.ui.lib.Tile",
            "ps.app.ui.lib.TilePopoverContent",
            "ps.app.ui.lib.Timeline"
        ],
        elements: [
            "ps.app.ui.lib.TileAnnotation",
            "ps.app.ui.lib.TileAttribute"
        ]
    });

    /**
     * Possible color for Timeline and Overview.
     * @enum {string}
     */
    ps.app.ui.lib.LaneColor = {
        LightOrange: "LightOrange",
        LightGreen: "LightGreen",
        LightGold: "LightGold",
        LightPurple: "LightPurple",
        LightPink: "LightPink",
        MediumOrange: "MediumOrange",
        MediumGreen: "MediumGreen",
        MediumGold: "MediumGold",
        MediumPurple: "MediumPurple",
        MediumPink: "MediumPink",
        DarkOrange: "DarkOrange",
        DarkGreen: "DarkGreen",
        DarkGold: "DarkGold",
        DarkPurple: "DarkPurple",
        DarkPink: "DarkPink"
    };

    /**
     * Supported CDM attribute types
     * @enum {String}
     */
    ps.app.ui.lib.CDMAttrType = {
        Text: "text",
        Number: "num",
        Freetext: "freetext",
        Date: "time", // legacy type "time" means date in fact
        Datetime: "datetime"
    };

    /**
     * Defines the mode of the chart.
     * @enum {string}
     */
    ps.app.ui.lib.ChartMode = {
        Dot: "Dot",
        Line: "Line"
    };

    return ps.app.ui.lib;
});
