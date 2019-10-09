sap.ui.define([
    "jquery.sap.global",
    "ps/app/ui/lib/TileAnchor",
    "ps/app/ui/lib/TilePopoverContent",
    "ps/app/ui/utils/Utils",
    "sap/m/Button",
    "sap/m/Popover",
    "sap/ui/core/Control"
], function (jQuery, TileAnchor, TilePopoverContent, Utils, Button, Popover, Control) {
    "use strict";

    /**
     * Constructor for a new Tile.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The Tile control is used to visualize one or many interactions in a Lane of the Timeline.
     * @extends sap.ui.core.Control
     * @alias ps.app.ui.lib.Tile
     */
    var Tile = Control.extend("ps.app.ui.lib.Tile", {
        metadata: {
            library: "ps.app.ui.lib",
            properties: {
                /**
                 * End date of the interaction. For point-interaction it has to be the same as the start.
                 */
                end: {
                    type: "object",
                    group: "Data"
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
                 * String to uniquely identify an interaction.
                 */
                key: {
                    type: "string",
                    group: "Data"
                },
                /**
                 * The attributes of the represented interaction.
                 * This is an array of attributes. An attribute is an object of type
                 * {
                 *   main: string,      // Information whether this attribute should be present on the Tile itself rather than only in the details Popover.
                 *   mainOrder: string, // Order in which this attribute appears on the Tile. The order in the Popover is determined by the array of attributes.
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
                },
                /**
                 * Hidden aggregation for the on-click Popover.
                 */
                _popover: {
                    type: "sap.m.Popover",
                    multiple: false,
                    visibility: "hidden"
                },
                /**
                 * Hidden aggregation for the on-click Popover anchor.
                 * The Tile itself cannot be used directly as it can be too large and cause weird effects.
                 * See https://github.wdf.sap.corp/hc/mri-pot/issues/795
                 */
                _anchor: {
                    type: "ps.app.ui.lib.TileAnchor",
                    multiple: false,
                    visibility: "hidden"
                }
            },
            associations: {
                /**
                 * Tiles that are not shown but stacked under this one in the rendering.
                 */
                hiddenTiles: {
                    type: "ps.app.ui.lib.Tile",
                    multiple: true,
                    singleName: "hiddenTile"
                }
            },
            events: {
                /**
                 * Event is fired when the user clicks on Tile, before the Popover with the Tile details is opened.
                 */
                press: {
                    parameters: {
                        /**
                         * The title which is also used for the Popover.
                         * If there are no stacked Tiles, it is the Tile name, otherwise the Lane name.
                         */
                        title: {
                            type: "string"
                        },
                        /**
                         * The timeframe for the Tile as string representation.
                         */
                        displayTime: {
                            type: "string"
                        },
                        /**
                         * The list of Tiles represented by the clicked Tile.
                         */
                        tiles: {
                            type: "ps.app.ui.lib.Tile[]"
                        }
                    }
                },
                /**
                 * Event is fired when the user clicks on the VariantBrowser-Button inside the Tile-Popover.
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

    /** @const{number} Minimum Tile width */
    Tile.MIN_WIDTH = 200;
    /** @const{number} Minimum Time Indicator width */
    Tile.TIME_INDICATOR_MIN_WIDTH = 10;
    /** @const{number} Minimum distance between two Time Indicators */
    Tile.TIME_INDICATOR_MIN_DISTANCE = 10;

    /**
     * Initialize the Tile.
     * @override
     * @protected
     */
    Tile.prototype.init = function () {
        this.setAggregation("_anchor", new TileAnchor(), true);
    };

    /**
     * Hook to modify the rendered control.
     * Adds an on focus handler that will update the viewport of the Timeline to center this Tile, if it is not currently visible.
     * @protected
     * @override
     */
    Tile.prototype.onAfterRendering = function () {
        this.$("tile").bind("focusin focus", function ($event) {
            $event.preventDefault();
            this.getLane().$("body").scrollLeft(0);
            if (this.getLeft() > this._getScale().range()[1] || this.getLeft() + this.getWidth() < 0) {
                this.getLane().getTimeline().scrollToDate(this._getScale().invert(this.getLeft() + this.getWidth() / 2));
            }
        }.bind(this));
    };

    /**
     * Function is called when tap occurs on the Tile.
     * Fires the Tile item event and opens the Popover with the details.
     * @private
     */
    Tile.prototype.onsapenter = function () {
        this._press();
    };

    /**
     * Function is called when tap occurs on the Tile.
     * Fires the Tile item event and opens the Popover with the details.
     * @private
     */
    Tile.prototype.onsapspace = function () {
        this._press();
    };

    /**
     * Function is called when tap occurs on the Tile.
     * Fires the Tile item event and opens the Popover with the details.
     * @param {jQuery.Event} oEvent the touch event.
     * @private
     */
    Tile.prototype.ontap = function (oEvent) {
        oEvent.setMarked();
        this._press();
    };

    /**
     * Add a Tile to the Association hiddenTiles.
     * Determines the stacked-status of this Tile:
     * True, if this or the newly added Tile are not point-events or the start times vary.
     * @param {ps.app.ui.lib.Tile} oTile Tile to be associated
     * @override
     */
    Tile.prototype.addHiddenTile = function (oTile) {
        if (this.isDated() && (!this.isPoint() || !oTile.isPoint() || this.getStart().getTime() !== oTile.getStart().getTime())) {
            this._isStacked = true;
        }
        this.addAssociation("hiddenTiles", oTile, true);
    };

    /**
     * Set the pixel of width to be added or removed to avoid overlap.
     * @param {number} width amount of pixels adjusted in width
     * @override
     */
    Tile.prototype.resize = function (width) {
        this._isResized = width;
    };

    /**
     * Return the list of TileAttributes, that should be shown on a Tile.
     * @returns {ps.app.ui.lib.TileAttribute[]} List of TileAttributes
     */
    Tile.prototype.getMainAttributes = function () {
        return this.getAttributes().filter(function (mTileAttribute) {
            return Tile.getMain(mTileAttribute);
        }).sort(function (mTileAttributeA, mTileAttributeB) {
            return Tile.getMainOrder(mTileAttributeA) - Tile.getMainOrder(mTileAttributeB);
        });
    };

    /**
     * Return the number of tiles this Tile represents.
     * @returns {number} Number of hidden Tiles plus 1
     */
    Tile.prototype.getBadgeCount = function () {
        return this.getHiddenTiles().length + 1;
    };

    /**
     * Return the name to be displayed as the tile title.
     * When multiple tiles have been merged this is the name of the lane.
     * @returns {string} Tile name or Lane name
     */
    Tile.prototype.getDisplayName = function () {
        return this.isMultiple() ? this.getGroupName() : this.getName();
    };

    /**
     * Returns the width of the duration bar for this Tile.
     * For Tiles that represent point events it defaults to 10.
     * @returns {number} Width in pixel
     */
    Tile.prototype.getDurationWidth = function () {
        return Math.max(this.getRight() - this.getLeft(), 10);
    };

    /**
     * Return the name for a group of tiles.
     * For now this is the name of the lane.
     * @returns {string} Name of the parent lane.
     */
    Tile.prototype.getGroupName = function () {
        return this.getLane().getTitle();
    };

    /**
     * Returns an array of time indicators for the tiles represented by this tile.
     * Each time indicator has the following structure:
     *   {
     *       left: <start time (left border) of time indicator in pixel coordinates>,
     *       width: <duration of time indicator in pixels>,
     *       numRepresentedInteractions: <the number of interactions which are represented by this time indicator (due to clustering of time indicators)>
     *   }
     *
     * @returns {object[]} list of time indicators
     */
    Tile.prototype.getTimeIndicators = function () {
        var aTimeIndicators = [];
        var mCurrentTimeIndicator = {
            left: 0,
            width: 0,
            numRepresentedInteractions: 0
        };

        this.getRepresentedTiles().forEach(function (oTile, index) {
            // Always start new visible tile cluster from first tile
            // Iterate over rest of tiles, adding them to current cluster OR starting a new
            // cluster based on their overlap with the current cluster
            if (index === 0 || mCurrentTimeIndicator.left + mCurrentTimeIndicator.width + Tile.TIME_INDICATOR_MIN_DISTANCE <= oTile.getLeft()) {
                // start new tile cluster
                mCurrentTimeIndicator = {
                    left: oTile.getLeft(),
                    width: Math.max(oTile.getRight() - oTile.getLeft(), Tile.TIME_INDICATOR_MIN_WIDTH),
                    numRepresentedInteractions: 1
                };
                aTimeIndicators.push(mCurrentTimeIndicator);
            } else {
                // add tile to current tile cluster
                mCurrentTimeIndicator.numRepresentedInteractions += 1;
                mCurrentTimeIndicator.width = Math.max(oTile.getRight() - mCurrentTimeIndicator.left, mCurrentTimeIndicator.width);
            }
        });

        return aTimeIndicators;
    };

    /**
     * Returns the responsible Lane control.
     * @returns {ps.app.ui.lib.Lane|undefined} Lane for this Tile
     */
    Tile.prototype.getLane = function () {
        var oParent = this.getParent();
        if (oParent instanceof ps.app.ui.lib.Lane) {
            return oParent;
        }
    };

    /**
     * Return the value for the css-property left.
     * The calculation is done by using the scale of the Timeline.
     * @returns {number} Position in pixel
     */
    Tile.prototype.getLeft = function () {
        return isNaN(this.getStart()) ? 0 : this._getScale()(Utils.utcToLocal(this.getStart()));
    };

    /**
     * Returns a list of Tiles that this Tile represents.
     * This function resolves the Association and returns an array of Tiles.
     * @returns {ps.app.ui.lib.Tile[]} List of represented Tiles
     */
    Tile.prototype.getRepresentedTiles = function () {
        return [this].concat(this.getHiddenTiles().map(function (sTileId) {
            return sap.ui.getCore().byId(sTileId);
        }));
    };

    /**
     * Return the value of the right end of the Tile.
     * This does not necessarily correspond to the width of the Tile.
     * @returns {number} Position in pixel
     */
    Tile.prototype.getRight = function () {
        return isNaN(this.getEnd()) ? 0 : this._getScale()(Utils.utcToLocal(this.getEnd()));
    };

    /**
     * Return "simple" Details for a merged Tile.
     * The simple details is a list of the names of each represented tile.
     * Duplicate names are counted in parens instead.
     * @returns {string} Merged list of all tiles.
     */
    Tile.prototype.getSimpleDetails = function () {
        var mTileNames = {};
        this.getRepresentedTiles().forEach(function (oRepresentedTile) {
            var sName = oRepresentedTile.getName();
            if (mTileNames[sName]) {
                mTileNames[sName] += 1;
            } else {
                mTileNames[sName] = 1;
            }
        });
        return Object.keys(mTileNames).map(function (sTileName) {
            if (mTileNames[sTileName] === 1) {
                return sTileName;
            } else {
                return sTileName + " (" + mTileNames[sTileName] + ")";
            }
        }).join(", ");
    };

    /**
     * Return the timestring for only this Tile, regardless of any represented Tiles.
     * @returns {string} Locale depended timestring
     */
    Tile.prototype.getTileTime = function () {
        if (!this.isDated()) {
            return Utils.getText("HPH_PAT_CONTENT_UNDATED");
        }
        if (this.isPoint()) {
            return Utils.formatDate(this.getStart());
        }
        return Utils.formatDate(this.getStart()) + " - " + Utils.formatDate(this.getEnd());
    };

    /**
     * Return the width of only this Tile.
     * @returns {number} Width in pixel
     */
    Tile.prototype.getTileWidth = function () {
        return Math.max(this.getRight() - this.getLeft(), Tile.MIN_WIDTH);
    };

    /**
     * Return the timestring for an array of tiles.
     * @param   {array}  aTiles Array of tiles to compute the timestring for
     * @returns {string} String containing the displayTime
     * @private
     */
    Tile._getTimeOfTiles = function (aTiles) {
        var iMinDate = Math.min.apply(null, aTiles.map(function (oTile) {
            return oTile.getStart();
        }));
        var iMaxDate = Math.max.apply(null, aTiles.map(function (oTile) {
            return oTile.getEnd();
        }));
        if (iMinDate !== iMaxDate) {
            return Utils.formatDate(new Date(iMinDate)) + " - " + Utils.formatDate(new Date(iMaxDate));
        } else {
            return Utils.formatDate(new Date(iMinDate));
        }
    };

    /**
     * Return the timestring to be displayed in the tile.
     * When multiple tiles have been merged the time is calculated from the list of tiles.
     * If the tile represents a point in time, a single time will be returned.
     * (For merged tiles a single time is returned if all of them represent the same point in time.)
     * Otherwise the timestring will contain two times connected with a dash.
     * @returns {string} String containing the displayTime
     */
    Tile.prototype.getTime = function () {
        if (this.isStacked() && this.isDated()) {
            return Tile._getTimeOfTiles(this.getRepresentedTiles());
        }
        return this.getTileTime();
    };

    /**
     * Return the display width of this tile.
     * The width is calculated from the start date of this Tile and the last end date of all represented Tiles.
     * @returns {number} Width in pixel
     */
    Tile.prototype.getWidth = function () {
        if (this.isStacked()) {
            // get max(=last) end date of represented tiles
            var maxRight = Math.max.apply(null, this.getTimeIndicators().map(function (oTimeIndicator) {
                return oTimeIndicator.left + oTimeIndicator.width;
            }, this));
            return Math.max(maxRight - this.getLeft(), Tile.MIN_WIDTH);
        }
        return this.getTileWidth();
    };

    /**
     * Returns true if start and end date of this Tile are valid.
     * @returns {boolean} True, if the Tile is dated.
     */
    Tile.prototype.isDated = function () {
        return !isNaN(this.getStart()) && !isNaN(this.getEnd());
    };

    /**
     * Returns true if this Tile has hidden Tiles associated.
     * @returns {Boolean} True, if this Tile represents multiple Tiles.
     */
    Tile.prototype.isMultiple = function () {
        return Boolean(this.getHiddenTiles().length);
    };

    /**
     * Detects if the interaction described by this tile is a point in time.
     * @returns {Boolean} True, if start and end is the same.
     */
    Tile.prototype.isPoint = function () {
        return this.getStart().getTime() === this.getEnd().getTime();
    };

    /**
     * Returns true if this Tile has hidden Tiles associated that are hidden due to the zoom level.
     * @returns {Boolean} True, if this Tile represents multiple Tiles with different Dates.
     */
    Tile.prototype.isStacked = function () {
        return this._isStacked;
    };

    /**
     * Return a value to be reduced from current tile width to avoid overlap.
     * @returns {number} Number, the width to be resized in case of overlap.
     */
    Tile.prototype.isResized = function () {
        return this._isResized;
    };


    /**
     * Removes all Tiles from the Association hiddenTiles.
     * Also sets the stacked-status to false.
     * @override
     */
    Tile.prototype.removeAllHiddenTiles = function () {
        this._isStacked = false;
        this.removeAllAssociation("hiddenTiles", true);
    };

    /**
     * Reposition a Tile.
     * Intended as a cheap alternative to rerendering after a panning of the Timeline without zoom change.
     */
    Tile.prototype.reposition = function () {
        if (this.getVisible()) {
            this.$("tile").css("left", this.getLeft());
            this.getAggregation("_anchor").rerender();
        }
    };

    /**
     * Handle the item event.
     * The event can be triggered by mouse or keyboard events.
     * Fires the Tile press event and opens the Popover with the details.
     * @private
     * @returns {sap.m.Popover} The opened Popover
     */
    Tile.prototype._press = function () {
        this.firePress({
            title: this.getDisplayName(),
            displayTime: this.getTileTime(),
            tiles: this.getRepresentedTiles()
        });
        if (!this._oPopover) {
            this._oPopover = new Popover({
                contentWidth: "240px",
                horizontalScrolling: false,
                placement: sap.m.PlacementType.Horizontal,
                showHeader: false,
                verticalScrolling: false
            });
            this.setAggregation("_popover", this._oPopover, true);
        }
        this._oPopover.removeAllContent();
        this._oPopover.addContent(new TilePopoverContent({
            color: this.getLane().getColor(),
            count: this.getBadgeCount(),
            time: this.getTileTime(),
            title: this.getDisplayName(),
            tiles: this.getRepresentedTiles()
        }));
        this._oPopover.openBy(this.getAggregation("_anchor"));
        return this._oPopover;
    };

    /**
     * Manually open the tile popover.
     * Fires the Tile press event and opens the Popover with the details for only this Tile or an array of tiles (if aTiles is given).
     * @param  {object} oDom DOM object to open the popover by
     * @param  {array}  aTiles Array of tiles that should be included into the popover (default: [this])
     * @returns {sap.m.Popover} The opened Popover.
     */
    Tile.prototype.openTilePopover = function (oDom, aTiles) {
        if (!aTiles) {
            aTiles = [this];
        }
        var sTitle = aTiles.length > 1 ? this.getGroupName() : this.getName();
        var sTime = Tile._getTimeOfTiles(aTiles);

        this.firePress({
            title: sTitle,
            displayTime: sTime,
            tiles: aTiles
        });
        if (!this._oPopover) {
            this._oPopover = new Popover({
                contentWidth: "240px",
                horizontalScrolling: false,
                placement: sap.m.PlacementType.Horizontal,
                showHeader: false,
                verticalScrolling: false
            });
            this.setAggregation("_popover", this._oPopover, true);
        }
        this._oPopover.removeAllContent();
        this._oPopover.addContent(new TilePopoverContent({
            color: this.getLane().getColor(),
            count: aTiles.length,
            time: sTime,
            title: sTitle,
            tiles: aTiles
        }));
        this._oPopover.openBy(oDom);
        return this._oPopover;
    };

    /**
     * Returns the scale of the Timeline.
     * @returns {d3.time.scale} d3 time scale used by the Timeline
     * @private
     */
    Tile.prototype._getScale = function () {
        return this.getLane().getTimeline().getScale();
    };

    /**
     * Getter for the name of a tile attribute.
     * @param {object} mTileAttribute A tile attribute
     * @returns {string} The name of the tile attribute
     */
    Tile.getAttributeName = function (mTileAttribute) {
        return mTileAttribute.name;
    };

    /**
     * Getter for the values of a tile attribute.
     * @param {object} mTileAttribute A tile attribute
     * @returns {string} The values of the tile attribute
     */
    Tile.getAttributeValues = function (mTileAttribute) {
        if (Array.isArray(mTileAttribute.values)) {
            return mTileAttribute.values;
        } else {
            return [mTileAttribute.values];
        }
    };

    /**
     * Getter for the main flag of a tile attribute.
     * @param {object} mTileAttribute A tile attribute
     * @returns {boolean} Whether the attribute is a main attribute
     */
    Tile.getMain = function (mTileAttribute) {
        return mTileAttribute.main;
    };

    /**
     * Getter for the order of a main tile attribute.
     * @param {object} mTileAttribute A main tile attribute
     * @returns {number} The order of the attribute
     */
    Tile.getMainOrder = function (mTileAttribute) {
        return mTileAttribute.mainOrder;
    };

    return Tile;
});
