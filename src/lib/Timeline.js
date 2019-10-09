sap.ui.define([
    "jquery.sap.global",
    "ps/app/ui/utils/Utils",
    "sap/ui/core/Control",
    "sap/ui/core/LocaleData",
    "sap/ui/core/format/DateFormat",
    "sap/ui/thirdparty/d3"
], function (jQuery, Utils, Control, LocaleData, DateFormat) {
    "use strict";

    /**
     * Constructor for a new Timeline.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The Timeline control shows patient interactions as Tiles according to start and end date
     * grouped into several Lanes.
     * @extends sap.ui.core.Control
     * @alias ps.app.ui.lib.Timeline
     */
    var Timeline = Control.extend("ps.app.ui.lib.Timeline", {
        metadata: {
            library: "ps.app.ui.lib",
            properties: {
                /**
                 * The patient's date of birth as Date object.
                 */
                dateOfBirth: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * The patient's date of death as Date object.
                 */
                dateOfDeath: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * Maximum date of range.
                 */
                dateRangeMax: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * Minimum date of range.
                 */
                dateRangeMin: {
                    type: "object",
                    group: "Data"
                },
                /**
                 * Show dateless interactions in an extra column on the right of all lane headers.
                 */
                showDatelessInteractions: {
                    type: "boolean",
                    group: "Data",
                    defaultValue: false
                }
            },
            defaultAggregation: "lanes",
            aggregations: {
                /**
                 * The Lanes for this Timeline.
                 */
                lanes: {
                    type: "ps.app.ui.lib.LaneBase",
                    multiple: true,
                    singleName: "lane",
                    bindable: "bindable"
                }
            }
        }
    });

    var oLocaleData = new LocaleData(sap.ui.getCore().getConfiguration().getLocale());

    /** @constant {Date} The default start date of the date range: Current timestamp minus 1 year. */
    Timeline.DEFAULT_RANGE_MIN = new Date(new Date().setFullYear(new Date().getFullYear() - 1));

    /** @constant {Date} The default end date of the date range: Current timestamp plus 1 year. */
    Timeline.DEFAULT_RANGE_MAX = new Date(new Date().setFullYear(new Date().getFullYear() + 1));

    /** @constant {number} Percentage size of one zoom and pan step. */
    Timeline.STEP_SIZE = 0.1;

    /** @constant {number} Minimum range of viewport Time. Equals 1 day. */
    Timeline.TIMERANGE_MIN = 86400000;

    /** @constant {number} Padding beyond the date range on either side as ratio. */
    Timeline.RANGE_PADDING = 0.1;

    /** @constant {number} Size (width and height) of a Tile in the minimap. */
    Timeline.MINIMAP_TILE_SIZE = 10;

    /** @constant {number} Size of an outer border in the minimap. */
    Timeline.MINIMAP_BORDER_SIZE = 1;

    /** @constant {number} Size of the resize handles in the minimap. */
    Timeline.MINIMAP_HANDLE_SIZE = 3;

    /**
     * Initialize the Timeline.
     * Create d3 objects: scale, axis and zoom.
     * The zoom extent is between 100 years and 1 day.
     * @override
     * @protected
     */
    Timeline.prototype.init = function () {
        this.dDateRangeMin = Timeline.DEFAULT_RANGE_MIN;
        this.dDateRangeMax = Timeline.DEFAULT_RANGE_MAX;

        this.dViewportMin = this.dDateRangeMin;
        this.dViewportMax = this.dDateRangeMax;

        this.iTimeRangeMin = Timeline.TIMERANGE_MIN;
        this.iTimeRangeMax = (this.dDateRangeMax - this.dDateRangeMin) * (1 + 2 * Timeline.RANGE_PADDING);

        this._d3scale = d3.time.scale();
        this.d3zoomScale = d3.time.scale();
        this.d3UpperAxis = d3.svg.axis()
            .scale(this._d3scale)
            .orient("top")
            .tickSize(0);
        this.d3LowerAxis = d3.svg.axis()
            .scale(this._d3scale)
            .orient("top")
            .tickSize(12);

        // NOTE: Use user-specific formatting in the future
        this.oDateFormatter = DateFormat.getDateInstance();
        this.oTimeFormatter = DateFormat.getTimeInstance({
            style: "short"
        });

        this._d3zoom = d3.behavior.zoom()
            .on("zoom", this._onZoomUpdate.bind(this))
            .on("zoomend", this._updateZoom.bind(this));

        this.d3mapScale = d3.time.scale();
        this.d3brush = d3.svg.brush()
            .x(this.d3mapScale)
            .on("brush", this._onBrushed.bind(this))
            .on("brushend", this._onBrushEnd.bind(this));

        sap.ui.core.ResizeHandler.register(this, function (oEvent) {
            oEvent.control.invalidate();
        });
    };

    // the following prevents the scrollbar to scroll up when sorting the lanes with jQuery sortable
    // see http://stackoverflow.com/questions/1735372/jquery-sortable-list-scroll-bar-jumps-up-when-sorting
    Timeline.prototype._fixHeight = function () {
        jQuery("#" + this.getId()).height(jQuery("#" + this.getId()).height());
    };

    Timeline.prototype._releaseHeight = function () {
        jQuery("#" + this.getId()).height("");
    };

    /**
     * Adjust the date of birth time to be displayed in UTC instead of browser local
     * @override
     */
    Timeline.prototype.getDateOfBirth = function () {
        return Utils.utcToLocal(this.getProperty("dateOfBirth"));
    };

    /**
     * Adjust the date of death time to be displayed in UTC instead of browser local
     * @override
     */
    Timeline.prototype.getDateOfDeath = function () {
        return Utils.utcToLocal(this.getProperty("dateOfDeath"));
    };

    /**
     * Call d3 objects after rendering.
     * Set the scale range based on the width of the Lanes div and the domain based on the specified viewport dates.
     * Render the top bar containing ruler and perform an initial clustering of the Tiles.
     * @override
     * @protected
     */
    Timeline.prototype.onAfterRendering = function () {
        var sIdSelector = "#" + this.getIdForLabel();
        var that = this;

        var oAreaRight = this.$("area-right");
        this._d3scale
            .range([0, oAreaRight.width()]);
        this.d3zoomScale
            .range([oAreaRight.position().left, oAreaRight.position().left + oAreaRight.width()]);

        // The following part creates a zoom handler that is limited to the lane area of the timeline
        // as we have to bind the zoom handler to the root div of the timeline which clashes with
        // JQuery's sortable behaviour on the left, i.e. both behaviors are active there and neither can
        // D3 otherwise be limited to the right area (in "zoomstart" we cannot stop the zoom event) nor
        // can JQuery's sortable being stopped from bubbling up of the events after it handles them.
        //
        // Our solution:
        // We define a mocked DOM element to attach D3's zoom handlers to. After having them we wrap our
        // own D3 event handler around it that checks whether the event was started in the right area.
        // If so, the corresponding original zoom handler will be called.

        // 1. Extract D3 zoom handlers
        var oZoomHandlers = {};
        var oMockedDOM = {};
        oMockedDOM.on = function (sEvent, fHandler) {
            oZoomHandlers[sEvent] = fHandler;
            return this;
        }.bind(oMockedDOM);
        this._d3zoom(oMockedDOM);

        // 2. Factory that creates our own zoom handlers
        function zoomProxyHandler(sEvent) {
            return function () {
                if (d3.mouse(this)[0] >= oAreaRight.position().left) {
                    return oZoomHandlers[sEvent].apply(this, arguments);
                }
            };
        }

        // 3. Mocked zoom object to attach our handlers to the target area
        function zoomProxy(g) {
            for (var sEvent in oZoomHandlers) {
                // disable doubleclick zoom step
                if (sEvent !== "dblclick.zoom") {
                    g.on(sEvent, zoomProxyHandler(sEvent));
                }
            }
            // Always restore proxies, as D3 overloads the event handlers during event handling
            g.on("mouseup.restoreProxies", function () {
                zoomProxy(g);
            });
            g.on("touchend.restoreProxies", function () {
                zoomProxy(g);
            });
        }

        this._setViewport(this.dViewportMin, this.dViewportMax, true);
        d3.select(this.$("area").get(0))
            .call(zoomProxy);

        this._drawMinimap();

        function reorderLanes() {
            var oBinding = that.getBinding("lanes");
            var aNewList = that.getLanes();

            function getLaneIndex(oLane) {
                var oDomRef = oLane.getDomRef();
                if (!oDomRef) {
                    // If no DOM node was found, look for the invisible placeholder node
                    oDomRef = jQuery.sap.domById(sap.ui.core.RenderPrefixes.Invisible + oLane.getId());
                }
                return jQuery(oDomRef).index();
            }

            aNewList.sort(function (a, b) {
                return getLaneIndex(a) - getLaneIndex(b);
            });

            aNewList = aNewList.map(function (oLane, rank) {
                var oData = oLane.getBindingContext().getObject();
                oData.rank = rank;
                return oData;
            });

            that._fixHeight();
            oBinding.getModel().setProperty(oBinding.getPath(), aNewList, oBinding.getContext());
            that.rerender();
            that._releaseHeight();
        }

        var nVisibleLanes = this.getLanes().reduce(function (counter, oLane) {
            if (oLane.getVisible()) {
                counter += 1;
            }
            return counter;
        }, 0);

        if (nVisibleLanes >= 2) {
            jQuery(sIdSelector + " .sapTlTimelineLanes").sortable({
                axis: "y",
                containment: "parent",
                // cursorAt: { top: 5 },
                delay: 200,
                distance: 0,
                handle: ".sapTlTimelineLaneHeader",
                items: "> .sapTlTimelineLaneFamily",
                tolerance: "pointer",
                update: reorderLanes,
                // start: function () {
                //     that._fixHeight();
                // },
                // stop: function () {
                //     that._releaseHeight();
                // },
                zIndex: 4
            }).disableSelection();
            // Fix for IE and Firefox where the area wouldn't get the focus on click (swallowed by sortable)
            jQuery(sIdSelector + " .sapTlTimelineLanes").click(function () {
                that.$("area").focus();
            });
        }
    };

    /**
     * Handler for keyboard arrow down without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapdown = function (oEvent) {
        if (oEvent.srcControl === this) {
            this.zoomOut();
            oEvent.preventDefault();
        }
    };

    /**
     * Handler for keyboard arrow left without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapleft = function (oEvent) {
        if (oEvent.srcControl === this) {
            if (sap.ui.getCore().getConfiguration().getRTL()) {
                this.panRight();
            } else {
                this.panLeft();
            }
            oEvent.preventDefault();
        }
    };

    /**
     * Handler for keyboard minus without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapminus = function (oEvent) {
        if (oEvent.srcControl === this) {
            this.zoomOut();
            oEvent.preventDefault();
        }
    };

    /**
     * Handler for keyboard plus without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapplus = function (oEvent) {
        if (oEvent.srcControl === this) {
            this.zoomIn();
            oEvent.preventDefault();
        }
    };

    /**
     * Handler for keyboard arrow right without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapright = function (oEvent) {
        if (oEvent.srcControl === this) {
            if (sap.ui.getCore().getConfiguration().getRTL()) {
                this.panLeft();
            } else {
                this.panRight();
            }
            oEvent.preventDefault();
        }
    };

    /**
     * Handler for keyboard arrow up without modifiers.
     * @private
     * @param {object} oEvent jQuery Event
     */
    Timeline.prototype.onsapup = function (oEvent) {
        if (oEvent.srcControl === this) {
            this.zoomIn();
            oEvent.preventDefault();
        }
    };

    /**
     * Returns the DOM Element that should get the focus.
     * Returns the lane area of the Timeline.
     * @protected
     * @override
     * @returns {HTMLElement} DOM Element that should get focus.
     */
    Timeline.prototype.getFocusDomRef = function () {
        return this.$("area-right").get(0);
    };

    /**
     * Return the scale used by the Timeline so the child controls can share it.
     * @returns {d3.time.scale} d3 time scale
     */
    Timeline.prototype.getScale = function () {
        return this._d3scale;
    };

    /**
     * Return a map of texts needed for rendering.
     * If the i18n model is set, take the texts from the Model.
     * @returns {object} Object with texts.
     */
    Timeline.prototype.getTexts = function () {
        var mTexts = {
            todayTooltip: "",
            dobTooltip: "",
            dodTooltip: ""
        };
        var oModel = this.getModel("i18n");
        if (oModel && oModel.getResourceBundle()) {
            mTexts.todayTooltip = Utils.getText("HPH_PAT_CONTENT_TODAY_TOOLTIP");
            mTexts.dobTooltip = Utils.getText("HPH_PAT_CONTENT_DOB_TOOLTIP");
            mTexts.dodTooltip = Utils.getText("HPH_PAT_CONTENT_DOD_TOOLTIP");
        }
        return mTexts;
    };

    /**
     * Move the viewport to the left by one {@link STEP_SIZE}.
     */
    Timeline.prototype.panLeft = function () {
        this._updateViewport(-Timeline.STEP_SIZE, -Timeline.STEP_SIZE);
    };

    /**
     * Move the viewport to the right by one {@link STEP_SIZE}.
     */
    Timeline.prototype.panRight = function () {
        this._updateViewport(Timeline.STEP_SIZE, Timeline.STEP_SIZE);
    };

    /**
     * Reset the zoom and position of the Tiles to the default.
     */
    Timeline.prototype.resetZoom = function () {
        var iPadding = (this.dDateRangeMax - this.dDateRangeMin) * Timeline.RANGE_PADDING;
        this._setViewport(this.dDateRangeMin.getTime() - iPadding, this.dDateRangeMax.getTime() + iPadding);
    };

    /**
     * Set the viewport to center on a given date.
     * Does not affect the zoom level.
     * @param {Date} dCenter Date of the new viewport center.
     */
    Timeline.prototype.scrollToDate = function (dCenter) {
        // When focussing a Tile, the browser might scrolls the lanes, which has to be undone
        var iHalf = (this.dViewportMax.getTime() - this.dViewportMin.getTime()) / 2;
        this._setViewport(dCenter.getTime() - iHalf, dCenter.getTime() + iHalf);
    };

    /**
     * Set the maximum date of the display range.
     * Also updates the viewport to the default display.
     * @override
     * @param {Date} dDateRangeMax Maximum date of range
     */
    Timeline.prototype.setDateRangeMax = function (dDateRangeMax) {
        if (dDateRangeMax) {
            this.dDateRangeMax = dDateRangeMax;
            var iRangeDelta = this.dDateRangeMax - this.dDateRangeMin;
            this.iTimeRangeMax = iRangeDelta * (1 + 2 * Timeline.RANGE_PADDING);
            this.setProperty("dateRangeMax", dDateRangeMax, false);
            this.resetZoom();
        }
    };

    /**
     * Set the minimum date of the display range.
     * Also updates the viewport to the default display.
     * @override
     * @param {Date} dDateRangeMin Minimum date of range
     */
    Timeline.prototype.setDateRangeMin = function (dDateRangeMin) {
        if (dDateRangeMin) {
            this.dDateRangeMin = dDateRangeMin;
            var iRangeDelta = this.dDateRangeMax - this.dDateRangeMin;
            this.iTimeRangeMax = iRangeDelta * (1 + 2 * Timeline.RANGE_PADDING);
            this.setProperty("dateRangeMin", dDateRangeMin, false);
            this.resetZoom();
        }
    };

    /**
     * Zoom in the viewport by one {@link STEP_SIZE}.
     */
    Timeline.prototype.zoomIn = function () {
        this._updateViewport(Timeline.STEP_SIZE, -Timeline.STEP_SIZE);
    };

    /**
     * Zoom out the viewport by one {@link STEP_SIZE}.
     */
    Timeline.prototype.zoomOut = function () {
        this._updateViewport(-Timeline.STEP_SIZE, Timeline.STEP_SIZE);
    };

    /**
     * Draw the minimap with d3.
     * @private
     */
    Timeline.prototype._drawMinimap = function () {
        var aVisibleLanes = this.getLanes().filter(function (oLane) {
            return oLane.getVisible();
        });
        var iMinimapHeight = Timeline.MINIMAP_TILE_SIZE * aVisibleLanes.length;

        var iRangePadding = (this.dDateRangeMax - this.dDateRangeMin) * 2 * Timeline.RANGE_PADDING;
        this.d3mapScale
            .range([0, this.$().find(".sapTlTimelineMap svg").width()])
            .domain([new Date(this.dDateRangeMin.getTime() - iRangePadding), new Date(this.dDateRangeMax.getTime() + iRangePadding)]);

        // Set the height on the svg and parent (both to prevent overflow)
        var d3svg = d3.select(this.getDomRef()).select(".sapTlTimelineMap")
            .style("height", iMinimapHeight + "px")
            .select("svg")
            .attr("height", iMinimapHeight);

        // Add one box for each (dated) tile
        aVisibleLanes.forEach(function (oLane, iLaneIndex) {
            // TODO: move into Lane
            if (oLane instanceof ps.app.ui.lib.Lane) {
                var nLastLeft = -1;
                var nLastRight = -1;
                oLane.getTiles().forEach(function (oTile) {
                    if (!isNaN(oTile.getStart()) && !isNaN(oTile.getEnd())) { // Only add Tiles with start and end date
                        var nX = this.d3mapScale(oTile.getStart()) - Timeline.MINIMAP_TILE_SIZE / 2;
                        var nWidth = Math.max(this.d3mapScale(oTile.getEnd()) - this.d3mapScale(oTile.getStart()), Timeline.MINIMAP_TILE_SIZE) - Timeline.MINIMAP_BORDER_SIZE * 2;

                        var nLeft = Math.floor(nX);
                        var nRight = Math.floor(nX + nWidth);
                        if (nLeft === nLastLeft && nRight === nLastRight) {
                            return;
                        }

                        nLastLeft = nLeft;
                        nLastRight = nRight;

                        d3svg.append("svg:rect")
                            .classed("sapTlTimelineMapTile sapTlTimelineMapTile" + oLane.getColor(), true)
                            .attr("x", nX)
                            .attr("y", iLaneIndex * Timeline.MINIMAP_TILE_SIZE)
                            .attr("height", Timeline.MINIMAP_TILE_SIZE - Timeline.MINIMAP_BORDER_SIZE * 2)
                            .attr("width", nWidth);
                    }
                }, this);
            }
        }, this);

        // Add DOB indicator to minimap if it is a valid date
        if (!isNaN(this.getDateOfBirth())) {
            d3svg.append("svg:rect")
                .classed("sapTlTimelineMapDOBArea", true)
                .attr("width", this.d3mapScale(this.getDateOfBirth()))
                .attr("height", iMinimapHeight);
            d3svg.append("svg:line")
                .classed("sapTlTimelineMapDOBLine", true)
                .attr("x1", this.d3mapScale(this.getDateOfBirth()))
                .attr("x2", this.d3mapScale(this.getDateOfBirth()))
                .attr("y2", iMinimapHeight);
        }

        // Add DOD indicator to minimap if it is a valid date
        if (!isNaN(this.getDateOfDeath())) {
            d3svg.append("svg:rect")
                .classed("sapTlTimelineMapDODArea", true)
                .attr("x", this.d3mapScale(this.getDateOfDeath()))
                .attr("width", this.d3mapScale.range()[1] - this.d3mapScale(this.getDateOfDeath()))
                .attr("height", iMinimapHeight);
            d3svg.append("svg:line")
                .classed("sapTlTimelineMapDODLine", true)
                .attr("x1", this.d3mapScale(this.getDateOfDeath()))
                .attr("x2", this.d3mapScale(this.getDateOfDeath()))
                .attr("y2", iMinimapHeight);
        }

        // Add today indicator to minimap if it falls within the map's timeframe
        var dToday = new Date();
        if (dToday > this.d3mapScale.domain()[0] && dToday < this.d3mapScale.domain()[1]) {
            d3svg.append("svg:line")
                .classed("sapTlTimelineMapToday", true)
                .attr("x1", this.d3mapScale(dToday))
                .attr("x2", this.d3mapScale(dToday))
                .attr("y2", iMinimapHeight);
        }

        // Add inverse of the brush: Gray area for non-visible timeframe
        d3svg.append("svg:rect")
            .classed("sapTlTimelineMapBrushInverse sapTlTimelineMapBrushInverseBegin", true)
            .attr("height", iMinimapHeight);

        d3svg.append("svg:rect")
            .classed("sapTlTimelineMapBrushInverse sapTlTimelineMapBrushInverseEnd", true)
            .attr("height", iMinimapHeight);

        // Add the brush itself as invisible element
        var d3brushG = d3svg.append("svg:g")
            .classed("sapTlTimelineMapBrush", true)
            .call(this.d3brush);

        // Set the height of all brush elements
        d3brushG.selectAll("rect")
            .attr("height", iMinimapHeight);

        // Move the resize handles "outside" of the brush
        d3brushG.select(".resize.e rect")
            .attr("x", Timeline.MINIMAP_BORDER_SIZE)
            .attr("width", Timeline.MINIMAP_HANDLE_SIZE);

        d3brushG.select(".resize.w rect")
            .attr("x", -(Timeline.MINIMAP_BORDER_SIZE + Timeline.MINIMAP_HANDLE_SIZE))
            .attr("width", Timeline.MINIMAP_HANDLE_SIZE);

        // Call update to set the correct position for moving elements
        this._updateMinimap();
    };

    /**
     * Handle the brush event.
     * A brush event is fired every time the brush is moved or changed.
     * Set the viewport to the current brush extent.
     * @private
     */
    Timeline.prototype._onBrushed = function () {
        this._setViewport.apply(this, this.d3brush.extent());
        d3.select(this.getDomRef()).select(".sapTlTimelineMapBrushInverseBegin")
            .attr("x", 0)
            .attr("width", this.d3mapScale(this.d3brush.extent()[0]));

        d3.select(this.getDomRef()).select(".sapTlTimelineMapBrushInverseEnd")
            .attr("x", this.d3mapScale(this.d3brush.extent()[1]))
            .attr("width", this.d3mapScale.range()[1] - this.d3mapScale(this.d3brush.extent()[1]));
    };

    /**
     * Handle the brushend event.
     * After ending the brushing, the minimap can be updated to the new zoom level.
     * @private
     */
    Timeline.prototype._onBrushEnd = function () {
        // Skip empty events that are sent in intervals
        if (!d3.event.sourceEvent) {
            return;
        }

        // Set or transition the brush extent to the current viewport
        if (this.d3brush.empty()) {
            this._updateMinimap(false);
        } else {
            this._updateMinimap(true);
        }
    };

    /**
     * Handle the zoom update.
     * Update the viewport dates, cluster the Tiles if necessary and update the position of the Tiles.
     * @private
     */
    Timeline.prototype._onZoomUpdate = function () {
        var domain = this.d3zoomScale.domain();
        this._setViewport(domain[0], domain[1]);
    };

    /**
     * Update the moving elements in the minimap.
     * @private
     * @param {boolean} bTransition True to animate the changes
     */
    Timeline.prototype._updateMinimap = function (bTransition) {
        var d3this = d3.select(this.getDomRef());
        var d3brushInverseBegin = d3this.select(".sapTlTimelineMapBrushInverseBegin");
        var d3brushInverseEnd = d3this.select(".sapTlTimelineMapBrushInverseEnd");
        var d3brushG = d3this.select(".sapTlTimelineMapBrush");

        if (bTransition) {
            d3brushInverseBegin = d3brushInverseBegin.transition();
            d3brushInverseEnd = d3brushInverseEnd.transition();
            d3brushG = d3brushG.transition();
        }

        d3brushInverseBegin
            .attr("x", 0)
            .attr("width", Math.max(this.d3mapScale(this.dViewportMin), 0));

        d3brushInverseEnd
            .attr("x", this.d3mapScale(this.dViewportMax))
            .attr("width", Math.max(this.d3mapScale.range()[1] - this.d3mapScale(this.dViewportMax), 0));

        d3brushG
            .call(this.d3brush.extent([this.dViewportMin, this.dViewportMax]));
    };

    /**
     * Update the d3 zoom.
     * Set the zoom scale's range and domain to the current values.
     * @private
     */
    Timeline.prototype._updateZoom = function () {
        this.d3zoomScale
            .domain([this.dViewportMin, this.dViewportMax]);
        this._d3zoom
            .x(this.d3zoomScale);
    };

    /**
     * Render the top bar of the Timeline containing the ruler and the indicator lines for today, DoB and DoD.
     * @private
     */
    Timeline.prototype._renderTimeAxis = function () {
        var iDiff = this.dViewportMax - this.dViewportMin;
        var that = this;

        if (iDiff > 1000 * 60 * 60 * 24 * 365 * 15) { // 15 years
            this.d3UpperAxis
                .ticks(0);
            this.d3LowerAxis
                .ticks(10)
                .tickFormat(d3.time.format("%Y"));
        } else if (iDiff > 1000 * 60 * 60 * 24 * 365 * 5) { // 5 years
            this.d3UpperAxis
                .ticks(0);
            this.d3LowerAxis
                .ticks(10)
                .tickFormat(d3.time.format("%Y"));
        } else if (iDiff > 1000 * 60 * 60 * 24 * 365) { // 1 year
            this.d3UpperAxis
                .ticks(d3.time.year, 1)
                .tickFormat(d3.time.format("%Y"));
            this.d3LowerAxis
                .ticks(10)
                .tickFormat(function (dDate) {
                    return oLocaleData.getMonths("abbreviated")[dDate.getMonth()];
                });
        } else if (iDiff > 1000 * 60 * 60 * 24 * 30 * 5) { // 5 month
            this.d3UpperAxis
                .ticks(d3.time.year, 1)
                .tickFormat(d3.time.format("%Y"));
            this.d3LowerAxis
                .ticks(d3.time.month, 1)
                .tickFormat(function (dDate) {
                    return oLocaleData.getMonths("abbreviated")[dDate.getMonth()];
                });
        } else if (iDiff > 1000 * 60 * 60 * 24 * 15) { // 15 days
            this.d3UpperAxis
                .ticks(d3.time.month, 1)
                .tickFormat(function (dDate) {
                    return oLocaleData.getMonths("abbreviated")[dDate.getMonth()] + " " + dDate.getFullYear();
                });
            this.d3LowerAxis
                .ticks(10)
                .tickFormat(d3.time.format("%e"));
        } else if (iDiff > 1000 * 60 * 60 * 24 * 3) { // 3 days
            this.d3UpperAxis
                .ticks(d3.time.month, 1)
                .tickFormat(function (dDate) {
                    return oLocaleData.getMonths("abbreviated")[dDate.getMonth()] + " " + dDate.getFullYear();
                });
            this.d3LowerAxis
                .ticks(d3.time.day, 1)
                .tickFormat(d3.time.format("%e"));
        } else {
            this.d3UpperAxis
                .ticks(d3.time.day, 1)
                .tickFormat(function (dDate) {
                    return this.oDateFormatter.format(dDate);
                }.bind(this));
            this.d3LowerAxis
                .ticks(10)
                .tickFormat(function (dDate) {
                    return this.oTimeFormatter.format(dDate);
                }.bind(this));
        }

        d3.select(this.getDomRef()).select(".sapTlTimelineRulerUpperAxis").call(this.d3UpperAxis);
        d3.select(this.getDomRef()).select(".sapTlTimelineRulerLowerAxis").call(this.d3LowerAxis);

        // add tooltips to the lower ruler
        d3.select(this.getDomRef()).selectAll(".sapTlTimelineRulerLowerAxis text")
            .each(function (dDate) {
                var tick = d3.select(this);
                var sTitle = that.oDateFormatter.format(dDate);
                if (iDiff <= 1000 * 60 * 60 * 24 * 3) {
                    // show the time of the day as well
                    sTitle += ", " + that.oTimeFormatter.format(dDate);
                }
                tick.append("title")
                    .text(sTitle);
            });

        this.$().find(".sapTlTimelineToday").css("left", "calc(" + this.getScale()(new Date()) + "px - 0.5rem)");

        var iDOBPosition = this.getScale()(this.getDateOfBirth());
        var $DOBLine = this.$().find(".sapTlTimelineDOB");
        if (iDOBPosition > 0) {
            $DOBLine.css({
                width: iDOBPosition,
                display: "block"
            });
        } else {
            $DOBLine.css("display", "none");
        }

        var iDODPosition = this.getScale()(this.getDateOfDeath());
        var $DODLine = this.$().find(".sapTlTimelineDOD");
        if (iDODPosition < this.getScale().range()[1]) {
            $DODLine.css({
                left: iDODPosition,
                display: "block"
            });
        } else {
            $DODLine.css("display", "none");
        }
    };

    /**
     * Set the new range of the viewport.
     * A change will only occur if the new range is within the allowed extents.
     * @private
     * @param   {Date|number} dViewportMin New min date as Date or timestamp number
     * @param   {Date|number} dViewportMax New max date as Date or timestamp number
     * @param   {boolean}     bForce       True, to force an update
     * @returns {boolean}     True, if the viewport was changed.
     */
    Timeline.prototype._setViewport = function (dViewportMin, dViewportMax, bForce) {
        var iViewportMin = dViewportMin instanceof Date ? dViewportMin.getTime() : dViewportMin;
        var iViewportMax = dViewportMax instanceof Date ? dViewportMax.getTime() : dViewportMax;

        // Only proceed if the input is a valid date
        if (isNaN(iViewportMin) || isNaN(iViewportMax)) {
            return false;
        }

        // Only proceed if the viewport has changed or force flag is set
        if (!bForce && iViewportMin === this.dViewportMin.getTime() && iViewportMax === this.dViewportMax.getTime()) {
            return false;
        }

        // Only proceed if the new date range is within the allowed limits
        var iViewportDelta = iViewportMax - iViewportMin;
        if (iViewportDelta < this.iTimeRangeMin || iViewportDelta > this.iTimeRangeMax) {
            return false;
        }

        // Make sure the new viewport doesn't go beyond the defined range limit
        if (iViewportMin < this.dDateRangeMin.getTime() - iViewportDelta * 2 * Timeline.RANGE_PADDING) {
            iViewportMin = this.dDateRangeMin.getTime() - iViewportDelta * 2 * Timeline.RANGE_PADDING;
            iViewportMax = iViewportMin + iViewportDelta;
        } else if (iViewportMax > this.dDateRangeMax.getTime() + iViewportDelta * 2 * Timeline.RANGE_PADDING) {
            iViewportMax = this.dDateRangeMax.getTime() + iViewportDelta * 2 * Timeline.RANGE_PADDING;
            iViewportMin = iViewportMax - iViewportDelta;
        }

        dViewportMin = new Date(iViewportMin);
        dViewportMax = new Date(iViewportMax);

        this._d3scale.domain([dViewportMin, dViewportMax]);

        // Reposition the Tiles if the range delta stayed the same (ie panning), otherwise cluster (ie zoom)
        if (!bForce && this.dViewportMax - this.dViewportMin === iViewportDelta) {
            this.getLanes().forEach(function (oLane) {
                oLane.reposition(this.getScale());
            }, this);
        } else {
            this.getLanes().forEach(function (oLane) {
                oLane.rearrange(this.getScale());
            }, this);
        }

        this.dViewportMin = dViewportMin;
        this.dViewportMax = dViewportMax;

        this._renderTimeAxis();

        // Update the zoom domain if the change did not originate there
        if (!d3.event || d3.event.type !== "zoom") {
            this._updateZoom();
        }

        // Update the brush's extent if the change did not originate there
        if (!d3.event || d3.event.type !== "brush") {
            this._updateMinimap();
        }

        return true;
    };

    /**
     * Move the viewport in both directions by the given deltas.
     * A change will only occur if the new range is within the allowed extents.
     * @private
     * @param   {number}  nDeltaMin Change for the viewportMinDate
     * @param   {number}  nDeltaMax Change for the viewportMaxDate
     * @returns {boolean} True, if the viewport was changed.
     */
    Timeline.prototype._updateViewport = function (nDeltaMin, nDeltaMax) {
        var iRange = this.dViewportMax - this.dViewportMin;
        var iMinTime = this.dViewportMin.getTime() + iRange * nDeltaMin;
        var iMaxTime = this.dViewportMax.getTime() + iRange * nDeltaMax;

        return this._setViewport(iMinTime, iMaxTime);
    };

    return Timeline;
});
