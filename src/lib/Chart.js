sap.ui.define([
    "jquery.sap.global",
    "./library",
    "./ChartBase",
    "./CircleStencil"
], function (jQuery, library, ChartBase, CircleStencil) {
    "use strict";
    /**
     * Constructor for a new Chart lane.
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

    var Chart = ChartBase.extend("ps.app.ui.lib.Chart", {
        metadata: {
            properties: {
                /**
                 * Char mode Chart.
                 */
                mode: {
                    type: "ps.app.ui.lib.ChartMode",
                    group: "Appearance",
                    defaultValue: ps.app.ui.lib.ChartMode.Dot
                }
            },
            events: {
                datapointClick: {
                    allowPreventDefault: true,
                    parameters: {
                        datapoint: {type: "string"},
                        d3Event: {type: "Event"}
                    }
                }
            }
        }
    });

    // Constants to distinguish the type of labels
    Chart.LAST_VALUE_TAG = 0;
    Chart.MIN_MAX_TAG = 1;
    Chart.FOCUS_TAG = 2;

    /** @const{number} The point with the shortest distance between center and mouse will get the focus if it is within this threshold */
    Chart.FOCUS_DISTANCE = 50;

    /** @const{number} Defines the circle radius of an unfocussed data point in pixels */
    Chart.CIRCLE_RADIUS = 4;

    /** @const{number} Pixel density of the circle stencil used to draw the data points.
     * Defines the resolution of the circle template used to draw all data points in the canvas. It should be >1 to avoid Jaggies.
     * Large values result in a poor anti-aliasing. A value of 2 turned out to work quite well.
     */
    Chart.STENCIL_DENSITY = 2;

    /** @const{number} Left and right margin of the lane.
     * The visible area is extended by a margin to the left and right. Data points with a center outside
     * this area are not drawn. The margin should be at least the radius of a focussed point.
     */
    Chart.CLIPPING_MARGIN = Math.ceil(Chart.CIRCLE_RADIUS * 1.7);

    Chart.prototype.init = function () {
        ChartBase.prototype.init.apply(this, arguments);

        // Some data points are drawn in an SVG layed over the Canvas in order to easily realize mouse interactions and animations.
        // This array keeps track of those points. A data point enters this array when it gets the focus and leaves it after it losing the focus
        // and after the focus-out animation is finished.
        this._trackedPoints = [];

        // The reason to keep points in the SVG is if they are used as an anchor for a popover that opens when clicking them
        // Points in this array enter before the popover opens and leave after close.
        this._popoverPoints = [];
    };

    Chart.prototype.updateFocus = function (aPosition) {
        this._focusPosition = aPosition;
        if (aPosition) {
            this._focusPoint = this.getClosestDatapoint(aPosition, Chart.FOCUS_DISTANCE, this._visibleData);
        } else {
            delete this._focusPoint;
        }
        this.updateFocusPoint(this._visibleData);
        this.updateLabels(false);
    };

    Chart.prototype.refreshChart = function (bInitial) {
        // Rendering optimization:
        // 1. Only render points that are within the viewport
        var dMinRenderDate = this.xAxisScale.invert(-Chart.CLIPPING_MARGIN);
        var dMaxRenderDate = this.xAxisScale.invert(this.xAxisScale.range()[1] + Chart.CLIPPING_MARGIN);
        var nFirstIndex = this.bisectDate(this.getData(), dMinRenderDate);
        var nLastIndex = this.bisectDate(this.getData(), dMaxRenderDate, nFirstIndex);

        var aValues = this.getData().map(function (oDatapoint) {
            return oDatapoint[this.getValueColumn()];
        }, this);

        // Exclude "NoValue" and malformed data for yAxis scale calculation
        var aNumericalValues = aValues.filter(function (oValue) {
            return typeof oValue === "number" && !isNaN(oValue);
        });

        this.yAxisScale.domain(d3.extent(aNumericalValues));
        aValues = aValues.slice(nFirstIndex, nLastIndex);

        delete this._minPoint;
        delete this._maxPoint;
        delete this._focusPoint;

        if (this.getData().length > 0) {
            var nMinIndex = aValues.reduce(function (oPrev, value, index) {
                if (typeof value === "number" && !isNaN(value) && value <= oPrev.value) {
                    oPrev.index = index;
                    oPrev.value = value;
                }
                return oPrev;
            }, {
                value: this.yAxisScale.domain()[1]
            }).index;

            var nMaxIndex = aValues.reduce(function (oPrev, value, index) {
                if (typeof value === "number" && !isNaN(value) && value >= oPrev.value) {
                    oPrev.index = index;
                    oPrev.value = value;
                }
                return oPrev;
            }, {
                value: this.yAxisScale.domain()[0]
            }).index;

            if (typeof nMaxIndex !== "undefined" && nFirstIndex + nMaxIndex !== this.getData().length - 1) {
                this._maxPoint = this.getData()[nFirstIndex + nMaxIndex];
            }
            if (typeof nMinIndex !== "undefined" && nFirstIndex + nMinIndex !== this.getData().length - 1 && nMinIndex !== nMaxIndex) {
                this._minPoint = this.getData()[nFirstIndex + nMinIndex];
            }
        }

        if (this.getData() && this.getMode() === ps.app.ui.lib.ChartMode.Line) {
            if (nFirstIndex > 0) {
                nFirstIndex--;
            }
            if (nLastIndex < this.getData().length) {
                nLastIndex++;
            }
        }
        var aData = this.getData().slice(nFirstIndex, nLastIndex).filter(function (oDatapoint) {
            var o = this.valueFunc(oDatapoint);
            return typeof o === "number" && !isNaN(o);
        }, this);
        this._visibleData = aData;

        // Prune tracked points that are no longer visible
        this._trackedPoints = this._trackedPoints.filter(function (oDatapoint) {
            var dStart = oDatapoint[this.getDateColumn()];
            return dMinRenderDate <= dStart && dStart <= dMaxRenderDate;
        }, this);

        this.updatePoints(aData);
        this.updateFocus(this._focusPosition);
        this.updateLabels(bInitial);
    };

    // rerender all points in the background canvas
    Chart.prototype.updatePoints = function (aData) {
        var oCanvas = this.$("canvas")[0];

        // It could be that we get here because of getVisible() === true,
        // but the DOM is not yet existent, because of a pending rendering event
        if (!oCanvas) {
            return;
        }

        var oCtx = oCanvas.getContext("2d");
        var nPoints = aData.length;
        var nX;
        var nY;

        // Clear canvas
        oCtx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);

        // Optionally render/update lines
        if (nPoints > 1 && this.getMode() === ps.app.ui.lib.ChartMode.Line) {
            var oFirst = aData[0];
            nX = this.dateFunc(oFirst);
            nY = this.valueFunc(oFirst);

            oCtx.lineWidth = 1.5;
            oCtx.beginPath();
            oCtx.moveTo(nX, nY);
            for (var i = 1; i < nPoints; ++i) {
                var oDatapoint = aData[i];
                nX = this.dateFunc(oDatapoint);
                nY = this.valueFunc(oDatapoint);
                oCtx.lineTo(nX, nY);
            }
            oCtx.stroke();
        }

        // Render dots
        var oStencil = this._dotStencil;
        var oStencilCanvas = oStencil.getCanvas();
        var aCenter = oStencil.getCenter();
        var nWidth = oStencil.getWidth();
        var nHeight = oStencil.getHeight();
        for (var j = 0; j < nPoints; ++j) {
            var oDatapoint2 = aData[j];
            nX = this.dateFunc(oDatapoint2);
            nY = this.valueFunc(oDatapoint2);
            oCtx.drawImage(oStencilCanvas, nX - aCenter[0], nY - aCenter[1], nWidth, nHeight);
        }
    };

    // rerender points only those points in the foreground SVG that are hovered or recently were (animation is still running)
    Chart.prototype.updateFocusPoint = function () {
        var that = this;
        var nMinPos = this.xAxisScale.range()[0] - Chart.CLIPPING_MARGIN;
        var nMaxPos = this.xAxisScale.range()[1] + Chart.CLIPPING_MARGIN;

        // remove points from the lists that are no longer visible
        this._trackedPoints = this._trackedPoints.filter(function (oDatapoint) {
            var nLeft = this.dateFunc(oDatapoint);
            return nMinPos <= nLeft && nLeft <= nMaxPos;
        }, this);
        this._popoverPoints = this._popoverPoints.filter(function (oDatapoint) {
            var nLeft = this.dateFunc(oDatapoint);
            return nMinPos <= nLeft && nLeft <= nMaxPos;
        }, this);

        // Handler to remove points the tracked list and potentially from the DOM,
        // who lose their focus and whose unfocus-animation ended
        var fRemoveHandler = function (oDatapoint) {
            var nIndex = that._trackedPoints.indexOf(oDatapoint);
            if (nIndex >= 0) {
                that._trackedPoints.splice(nIndex, 1);
                // We can remove the DOM element only if the popover isn't using it as an anchor
                if (that._popoverPoints.indexOf(oDatapoint) === -1) {
                    this.remove();
                }
            }
        };

        // Add current focus point to list of tracked points
        if (this._focusPoint) {
            if (this._trackedPoints.indexOf(this._focusPoint) === -1) {
                this._trackedPoints.push(this._focusPoint);
            }
        }

        // concat the lists of tracked and popover points, while removing duplicates
        var aSVGPoints = this._trackedPoints.concat(this._popoverPoints.filter(function (oTile) {
            return this._trackedPoints.indexOf(oTile) === -1;
        }, this));

        // Render/update data points
        var oCircle = this.getSVG().select(".sapTlTimelineChartDots").selectAll("g")
            .data(aSVGPoints, function (oDatapoint) {
                return oDatapoint[that.getKeyColumn()];
            })
            .attr("transform", function (oDatapoint) {
                return "translate(" + that.dateFunc(oDatapoint) + "," + that.valueFunc(oDatapoint) + ")";
            })
            .classed("focus", function (oDatapoint) {
                return oDatapoint === that._focusPoint;
            })
            .classed("focusInit", false)
            .on("transitionend", fRemoveHandler);

        var oGroup = oCircle.enter()
            .append("g")
            .attr("transform", function (oDatapoint) {
                return "translate(" + that.dateFunc(oDatapoint) + "," + that.valueFunc(oDatapoint) + ")";
            })
            .classed("focus", function (oDatapoint) {
                return oDatapoint === that._focusPoint;
            })
            .classed("focusInit", true)
            .on("transitionend", fRemoveHandler);

        oGroup.append("circle")
            .attr("r", Chart.CIRCLE_RADIUS)
            .on("click", function (d) {
                d3.event.stopPropagation(); // silence other listeners
                that.fireDatapointClick({
                    datapoint: d,
                    d3Event: d3.event});
            });

        // Add a circle with radius 0 as a centered anchor for the popover.
        // The circle above cannot be used as it changes its radius on hover and the popover would move
        oGroup.append("circle")
            .classed("sapTlTimelineChartDotHook", true);

        oCircle.exit()
            .remove();

        // All but the focus point will be removed after their animation finishes
        this.getSVG().select(".sapTlTimelineChartDots").selectAll("g.focus")
            .on("transitionend", null);
    };

    /**
     * Lock a datapoint, i.e. it will be stored in the list of datapoints that should be kept as DOM elements in the SVG.
     *
     * @param {Object} oDatapoint Object from the data aggregation of the Chart.
     */
    Chart.prototype.lockPoint = function (oDatapoint) {
        this._popoverPoints.push(oDatapoint);
        if (this._trackedPoints.indexOf(oDatapoint) === -1) {
            // The point doesn't exist in the SVG yet, render it
            this.updateFocusPoint();
        }
    };

    /**
     * Unlock a datapoint, i.e. it will be potentially removed from the SVG (unless it is hovered or currently being animated).
     *
     * @param {Object} oDatapoint Object from the data aggregation of the Chart.
     */
    Chart.prototype.unlockPoint = function (oDatapoint) {
        var index = this._popoverPoints.indexOf(oDatapoint);
        if (index !== -1) {
            this._popoverPoints.splice(index, 1);
            if (this._trackedPoints.indexOf(oDatapoint) === -1) {
                // No need to keep the point in the SVG any longer, remove it
                this.updateFocusPoint();
            }
        }
    };

    Chart.prototype.updateLabels = function (bInitial) {
        var that = this;
        var aExtremePoints = [];

        // last value
        if (this.getData().length > 0) {
            aExtremePoints.push([this.getLastDatapoint(), Chart.LAST_VALUE_TAG]);
        }

        // min/max points
        if (this._minPoint) {
            aExtremePoints.push([this._minPoint, Chart.MIN_MAX_TAG]);
        }

        if (this._maxPoint) {
            aExtremePoints.push([this._maxPoint, Chart.MIN_MAX_TAG]);
        }

        // focus
        if (this._focusPoint) {
            aExtremePoints.push([this._focusPoint, Chart.FOCUS]);
        }

        // Render/update labels
        var oLabel = d3.select("#" + this.getId() + " .sapTlTimelineChartLabels").selectAll(".sapTlTimelineChartLabel")
            .data(aExtremePoints, function (oDatapoint) {
                return oDatapoint[0][that.getKeyColumn()] + "$" + oDatapoint[1];
            })
            .style("left", function (oDatapoint) {
                return that.dateFunc(oDatapoint[0]) + "px";
            })
            .style("top", function (oDatapoint) {
                return that.valueFunc(oDatapoint[0]) + "px";
            })
            .text(function (oDatapoint) {
                return that.getDisplayValue(oDatapoint[0]);
            })
            .classed("focus", function (oDatapoint) {
                return oDatapoint[1] === Chart.FOCUS;
            });

        oLabel.enter()
            .append("div")
            .classed("sapTlTimelineChartLabel", true)
            .classed("focus", function (oDatapoint) {
                return oDatapoint[1] === Chart.FOCUS;
            })
            .style("left", function (oDatapoint) {
                return that.dateFunc(oDatapoint[0]) + "px";
            })
            .style("top", function (oDatapoint) {
                return that.valueFunc(oDatapoint[0]) + "px";
            })
            .text(function (oDatapoint) {
                return that.getDisplayValue(oDatapoint[0]);
            })
            .style("opacity", 0)
            .transition()
            .delay(function (oDatapoint) {
                return oDatapoint[1] === Chart.MIN_MAX_TAG && !bInitial ? 400 : 0;
            })
            .duration(function (oDatapoint) {
                return oDatapoint[1] === Chart.MIN_MAX_TAG && !bInitial ? 200 : 0;
            })
                .style("opacity", 1);


        oLabel.exit()
            .remove();
    };

    Chart.prototype.drawChart = function () {
        var that = this;
        var oCanvas = this.$("canvas")[0];
        var oCtx = oCanvas.getContext("2d");
        this._canvasWidth = jQuery(oCanvas).width();
        this._canvasHeight = jQuery(oCanvas).height();

        // Update densities and sizes
        this._canvasDensity = window.devicePixelRatio ? window.devicePixelRatio : 1;

        // Prepare canvas for displays with a resolution that is higher than 1 pixel, e.g. Retina
        oCanvas.setAttribute("width", this._canvasWidth * this._canvasDensity);
        oCanvas.setAttribute("height", this._canvasHeight * this._canvasDensity);
        oCanvas.style.width = this._canvasWidth;
        oCanvas.style.height = this._canvasHeight;
        oCtx.scale(this._canvasDensity, this._canvasDensity);

        // Clone stroke and fill style from already visible elements and create stencil
        var oChartDom = this.$();
        var sStrokeColor = oChartDom.find(".sapTlTimelineLaneDescriptionCount").css("color");
        var sFillColor = oChartDom.find(".sapTlTimelineLaneBody").css("background-color");

        this._dotStencil = new CircleStencil({
            radius: Chart.CIRCLE_RADIUS,
            density: Chart.STENCIL_DENSITY * this._canvasDensity
        });
        this._dotStencil.prepareStencil(Chart.CIRCLE_RADIUS, sStrokeColor, sFillColor);

        // Set canvas line and fill styles
        oCtx.strokeStyle = sStrokeColor;
        oCtx.fillStyle = sFillColor;
        oCtx.lineWidth = 1.5;
        oCtx.lineJoin = "bevel";

        this._trackedPoints = [];
        this._popoverPoints = [];

        // Attach listeners to SVG
        this.getSVG()
            .on("mousemove", function () {
                that.updateFocus(d3.mouse(this));
            })
            .on("mouseout", function () {
                that.updateFocus();
            });

        // TODO: Replace this by a one-way connection from timeline to charts, e.g. with property binding
        var timeline = this.getTimeline();
        this.xAxisScale.domain(timeline.getScale().domain());

        this._lineFunction = d3.svg.line()
            .x(this.dateFunc)
            .y(this.valueFunc);

        this.refreshChart(true);
    };

    return Chart;
});
