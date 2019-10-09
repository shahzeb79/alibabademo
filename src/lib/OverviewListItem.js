sap.ui.define([
    "jquery.sap.global",
    "ps/app/ui/lib/library",
    "ps/app/ui/utils/Utils",
    "sap/m/Button",
    "sap/m/ListItemBase"
], function (jQuery, library, Utils, Button, ListItemBase) {
    "use strict";

    /**
     * Constructor for a new OverviewListItem.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The OverviewListItem control is used to show an interaction in a List.
     * @extends sap.m.ListItemBase
     * @alias ps.app.ui.lib.OverviewListItem
     */
    var OverviewListItem = ListItemBase.extend("ps.app.ui.lib.OverviewListItem", {
        metadata: {
            library: "ps.app.ui.lib",
            properties: {
                /**
                 * Color of this OverviewListItem. Should be the same for all interactions in a group.
                 */
                color: {
                    type: "ps.app.ui.lib.LaneColor",
                    group: "Appearance"
                },
                /**
                 * End date of the interaction. For point-interaction it has to be the same as the start.
                 */
                end: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * Name of the group this interaction belongs to. In the Timeline, one Lane represents one group.
                 */
                groupName: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Name of this interaction.
                 */
                name: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Start date of the interaction.
                 */
                start: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * The attributes of the represented interaction.
                 * This is an array of attributes. An attribute is an object of type
                 * {
                 *   name: string,      // Name of the attribute.
                 *   values: string[]   // List of values of the attribute.
                 * }
                 */
                attributes: {
                    type: "object[]",
                    group: "Data",
                    defaultValue: []
                },
                /**
                 * SampleId for the VariantBrowser. If it is set, a Button to open the VariantBrowser is shown.
                 */
                variantBrowserSampleId: {
                    type: "string",
                    group: "Data"
                }
            },
            aggregations: {
                /**
                 * The annotations of the attributes of the represented interaction.
                 */
                annotations: {
                    type: "ps.app.ui.lib.TileAnnotation",
                    multiple: true,
                    singleName: "annotation",
                    bindable: true
                }
            },
            events: {
                /**
                 * Event is fired when the user clicks on the VariantBrowser-Button.
                 */
                vbPress: {
                    /**
                     * The variant browser sample id of this Control.
                     */
                    variantBrowserSampleId: {
                        type: "string"
                    }
                }
            }
        }
    });

    /**
     * Returns true if start and end date of this OverviewListItem are valid.
     * @returns {boolean} True, if the OverviewListItem is dated.
     */
    OverviewListItem.prototype.isDated = function () {
        return !isNaN(this.getStart()) && !isNaN(this.getEnd());
    };

    /**
     * Detects if the interaction described by this OverviewListItem is a point in time.
     * @returns {boolean} True, if start and end is the same.
     */
    OverviewListItem.prototype.isPoint = function () {
        return !this.isDated() || this.getStart().getTime() === this.getEnd().getTime();
    };

    /**
     * Return the timestring to be displayed in the tile.
     * If this OverviewListItem represents a point in time, a single time will be returned.
     * Otherwise the timestring will contain two times connected by a dash.
     * @returns {string} String containing the displayTime
     */
    OverviewListItem.prototype.getTime = function () {
        if (!this.isDated()) {
            return "";
        }
        if (this.isPoint()) {
            return Utils.formatDate(this.getStart());
        }
        return Utils.formatDate(this.getStart()) + " - " + Utils.formatDate(this.getEnd());
    };

    /**
     * Getter for the name of a tile attribute.
     * @param {object} mAttribute A tile attribute
     * @returns {string} The name of the tile attribute
     */
    OverviewListItem.getAttributeName = function (mAttribute) {
        return mAttribute.name;
    };

    /**
     * Getter for the values of a tile attribute.
     * @param {object} mAttribute A tile attribute
     * @returns {string[]} The values of the tile attribute
     */
    OverviewListItem.getAttributeValues = function (mAttribute) {
        if (Array.isArray(mAttribute.values)) {
            return mAttribute.values;
        } else {
            return [mAttribute.values];
        }
    };

    return OverviewListItem;
});
