sap.ui.define([
    "jquery.sap.global",
    "ps/app/ui/lib/LaneBase",
    "ps/app/ui/utils/Utils"
], function (jQuery, LaneBase, Utils) {
    "use strict";
    /**
     * Constructor for a new ChartBase.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The Chart control represents one group of attributes over time.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias ps.app.ui.lib.Chart
     */

    var ChartBase = LaneBase.extend("ps.app.ui.lib.ChartBase", {
        metadata: {
            properties: {
                /**
                 * Formatter for the values in the ChartBase.
                 */
                formatter: {
                    type: "string",
                    group: "Misc",
                    defaultValue: ""
                },
                /**
                 * Name of the date column for the ChartBase.
                 */
                dateColumn: {
                    type: "string",
                    group: "Data",
                    defaultValue: "_date"
                },
                /**
                 * Name of the value column for the ChartBase.
                 */
                valueColumn: {
                    type: "string",
                    group: "Data",
                    defaultValue: "value"
                },
                /**
                 * Name of the column that uniquely identifies a datapoint.
                 */
                keyColumn: {
                    type: "string",
                    group: "Data"
                },
                /**
                 * Array of data objects.
                 */
                data: {
                    type: "object[]",
                    group: "Data",
                    defaultValue: []
                },
                /**
                 * Text that is shown as last value when there is no data.
                 */
                noDataText: {
                    type: "string",
                    group: "Misc",
                    defaultValue: "?"
                }
            }
        }
    });

    ChartBase.prototype.init = function () {
        var that = this;

        this.xAxisScale = d3.time.scale();
        this.yAxisScale = d3.scale.linear();
        this.yPadding = 10;
        this.bisectDate = d3.bisector(function (d) {
            return d[that.getDateColumn()];
        }).left;

        this.dateFunc = function (oDatapoint) {
            return this.xAxisScale(oDatapoint[this.getDateColumn()]);
        }.bind(this);

        this.valueFunc = function (oDatapoint) {
            return this.yAxisScale(oDatapoint[this.getValueColumn()]);
        }.bind(this);

        // this.xAxis;
        // this.yAxis;
        // this.svg;
        // this.width;
        // this.height;
        // this.bisectDate;
    };

    ChartBase.prototype.getSVG = function () {
        return d3.select("#" + this.getId() + " svg");
    };

    ChartBase.prototype._updateScales = function () {
        var svg = this.getSVG();
        var nHeight = jQuery(svg[0]).height();

        // We set the xAxisScale ourselves only when its not already set.
        // In general, we prefer updates from the parent timeline to be pixel synchronized.
        // If we try to always take our own width here to set the range, we get a wrong width due to a dynamic scrollbar which depends
        // on lanes rendered later, see hc/mri-pot#650.
        if (this.xAxisScale.range[1] === 1) {
            var nWidth = jQuery(svg[0]).width();
            this.xAxisScale.range([0, nWidth]);
        }
        this.yAxisScale.range([nHeight - this.yPadding, this.yPadding]);

        var aValues = this.getData().map(function (oDatapoint) {
            return oDatapoint[this.getValueColumn()];
        }, this);

        // Exclude "NoValue" for yAxis scale calculation
        var aNumericalValues = aValues.filter(function (oValue) {
            return typeof oValue === "number" && !isNaN(oValue);
        });

        this.yAxisScale.domain(d3.extent(aNumericalValues));

        // this.xAxis = d3.svg.axis()
        //     .scale(this.xAxisScale)
        //     .orient("bottom");

        // this.yAxis = d3.svg.axis()
        //     .scale(this.yAxisScale)
        //     .orient("left");
    };

    ChartBase.prototype.refreshChart = function () {
        throw new Error("To be implemented by subclass");
    };

    ChartBase.prototype.drawChart = function () {
        throw new Error("To be implemented by subclass");
    };

    ChartBase.prototype.onAfterRendering = function () {
        LaneBase.prototype.onAfterRendering.apply(this, arguments);

        this._updateScales();
        this.drawChart();
    };

    ChartBase.prototype.getClosestDatapoint = function (aPosition, nMaxDistance, aDatapoints) {
        var that = this;

        // Minimize Euklidian distance
        if (!nMaxDistance) {
            nMaxDistance = Infinity;
        }

        if (!aDatapoints) {
            aDatapoints = this.getData() || [];
        }

        return aDatapoints.reduce(function (oMin, oDatapoint) {
            var nDX = that.dateFunc(oDatapoint);
            var nDY = that.valueFunc(oDatapoint);
            if (!isNaN(nDX) && !isNaN(nDY)) {
                nDX -= aPosition[0];
                nDY -= aPosition[1];
                var nDist = Math.sqrt(nDX * nDX + nDY * nDY);
                if (nDist < oMin.dist) {
                    oMin.dist = nDist;
                    oMin.datapoint = oDatapoint;
                }
            }
            return oMin;
        }, {
            dist: nMaxDistance
        }).datapoint;
    };

    /**
     * Returns the last entry of the data array or undefined if empty.
     * @returns {object|undefined} Last data entry or undefined
     */
    ChartBase.prototype.getLastDatapoint = function () {
        var aData = this.getData() || [];
        return aData[aData.length - 1];
    };

    /**
     * Returns the responsible Lane control.
     * @returns {ps.app.ui.lib.Lane|undefined} Lane for this Chart
     */
    ChartBase.prototype.getLane = function () {
        var oParent = this.getParent();
        if (oParent instanceof ps.app.ui.lib.Lane) {
            return oParent;
        }
    };

    ChartBase.prototype.getDisplayValue = function (oDataPoint) {
        if (this.getFormatter()) {
            return this.getFormatter().replace(/{(\$?\w+)}/g, function (_, sPlaceholderAttributeId) {
                var aValues = oDataPoint[sPlaceholderAttributeId];
                if (Array.isArray(aValues)) {
                    return oDataPoint[sPlaceholderAttributeId].join(", ");
                } else {
                    return typeof aValues !== "undefined" ? aValues : "?";
                }
            });
        } else {
            return oDataPoint[this.getValueColumn()];
        }
    };

    ChartBase.prototype.reposition = function (scale) {
        if (this.xAxisScale) {
            this.xAxisScale = scale.copy();
            if (this.getVisible()) {
                this.refreshChart();
            }
        }
        LaneBase.prototype.rearrange.apply(this, arguments);
    };

    ChartBase.prototype.rearrange = ChartBase.prototype.reposition;

    /**
     * Returns the most recent attribute value shown on the lane header.
     * @returns {string} The most recent attribute value or the no-value text
     * @override
     */
    ChartBase.prototype.getValue = function () {
        var mDatapoint = this.getLastDatapoint();
        if (mDatapoint) {
            return this.getDisplayValue(mDatapoint);
        } else {
            return this.getNoDataText();
        }
    };

    /**
     * Returns a formatted text with the timestamp of the most recent value used as tooltip on the lane header.
     * @returns {string} Formatted text with the timestamp of the most recent value
     * @override
     */
    ChartBase.prototype.getValueTooltip = function () {
        var mDatapoint = this.getLastDatapoint();
        if (mDatapoint) {
            return Utils.getText("HPH_PAT_CONTENT_CHART_VALUE_TOOLTIP", [Utils.formatDateTime(mDatapoint._startDate, true)]);
        } else {
            return "";
        }
    };

    return ChartBase;
});
