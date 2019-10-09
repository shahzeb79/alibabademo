sap.ui.define([
    "jquery.sap.global",
    "sap/ui/core/Control",
    "./Timeline",
    "sap/ui/thirdparty/jqueryui/jquery-ui-effect",
    "sap/ui/thirdparty/jqueryui/jquery-ui-core",
    "sap/ui/thirdparty/jqueryui/jquery-ui-widget",
    "sap/ui/thirdparty/jqueryui/jquery-ui-mouse",
    "sap/ui/thirdparty/jqueryui/jquery-ui-sortable"
], function (jQuery, Control, Timeline) {
    "use strict";
    /**
     * Constructor for a new Lane.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The LaneBase control is base class of the Lane and ChartLane controls.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias ps.app.ui.lib.LaneBase
     */

    var LaneBase = Control.extend("ps.app.ui.lib.LaneBase", {
        metadata: {
            library: "ps.app.ui.lib",
            properties: {
                /**
                 * Name of the Lane.
                 */
                title: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Tooltip for the Lane title.
                 */
                titleTooltip: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Main text shown in the lane header
                 */
                value: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Tooltip for the Lane value.
                 */
                valueTooltip: {
                    type: "string",
                    group: "Data",
                    defaultValue: ""
                },
                /**
                 * Color of the Lane.
                 */
                color: {
                    type: "ps.app.ui.lib.LaneColor",
                    group: "Appearance"
                },
                /**
                 * Whether the lane should be shown in minimized mode
                 */
                minimized: {
                    type: "boolean",
                    group: "Appearance",
                    defaultValue: false
                }
            },
            defaultAggregation: "tiles",
            aggregations: {
                /**
                 * List of sublanes shown below this lane.
                 */
                subLanes: {
                    type: "ps.app.ui.lib.LaneBase",
                    multiple: true
                },
                /**
                 * List of buttons shown on the top-right of the lane header.
                 */
                headerContent: {
                    type: "sap.ui.core.Control",
                    multiple: true
                },
                /**
                 * Additional content that is rendered at the right of the header.
                 */
                headerExtraContent: {
                    type: "sap.ui.core.Control",
                    multiple: true
                }
            }
        }
    });

    LaneBase.prototype.onAfterRendering = function () {
        var sIdSelector = "#" + this.getIdForLabel();
        var that = this;

        function reorderLanes() {
            var oBinding = that.getBinding("subLanes");
            var aNewList = jQuery(sIdSelector).sortable("toArray")
                .map(function (sId) {
                    var oLane = sap.ui.getCore().byId(sId);
                    return oLane.getBindingContext().getObject();
                });
            oBinding.getModel().setProperty(oBinding.getPath(), aNewList, oBinding.getContext());
            that.rerender();
        }

        var nVisibleSubLanes = this.getSubLanes().reduce(function (counter, oLane) {
            if (oLane.getVisible()) {
                counter += 1;
            }
            return counter;
        }, 0);

        if (nVisibleSubLanes >= 2) {
            jQuery(sIdSelector + " .sapTlTimelineSubLanes").sortable({
                axis: "y",
                containment: "parent",
                delay: 200,
                distance: 0,
                handle: ".sapTlTimelineLaneHeader",
                items: "> .sapTlTimelineLaneFamily",
                tolerance: "pointer",
                update: reorderLanes,
                zIndex: 4
            }).disableSelection();
        }
    };

    /**
     * Return the Timeline for this Lane.
     * @returns {ps.app.ui.lib.Timeline|undefined} This Lane's Timeline
     */
    LaneBase.prototype.getTimeline = function () {
        var oParent = this.getParent();
        if (oParent instanceof Timeline) {
            return oParent;
        } else if (oParent instanceof ps.app.ui.lib.LaneBase) {
            return oParent.getTimeline();
        }
    };

    LaneBase.prototype.reposition = function (scale) {
        if (this.getVisible()) {
            this.getSubLanes().forEach(function (oSubLane) {
                oSubLane.reposition(scale);
            });
        }
    };

    LaneBase.prototype.rearrange = function (scale) {
        if (this.getVisible()) {
            this.getSubLanes().forEach(function (oSubLane) {
                oSubLane.rearrange(scale);
            });
        }
    };

    return LaneBase;
});
