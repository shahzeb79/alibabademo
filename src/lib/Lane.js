sap.ui.define([
    "jquery.sap.global",
    "./CircleStencil",
    "./LaneBase",
    "./Tile"
], function (jQuery, CircleStencil, LaneBase, Tile) {
    "use strict";
    /**
     * Constructor for a new Lane.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The Lane control represents one group of interactions in the Timeline.
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias ps.app.ui.lib.Lane
     */
    var Lane = LaneBase.extend("ps.app.ui.lib.Lane", {
        metadata: {
            defaultAggregation: "tiles",
            aggregations: {
                /**
                 * List of Tiles in this Lane. Not all of them will be visualized due to stacking of Tiles.
                 */
                tiles: {
                    type: "ps.app.ui.lib.Tile",
                    multiple: true,
                    singleName: "tile"
                }
            }
        }
    });

    /** @const{number} Minimum distance between two tiles */
    Lane.MIN_TILE_DISTANCE = 4;

    /** @const{number} The point with the shortest distance between center and mouse will get the focus if it is within this threshold */
    Lane.FOCUS_DISTANCE = 50;

    /** @const{number} Defines the circle radius of an unfocussed data point in pixels */
    Lane.CIRCLE_RADIUS = 4;

    /** @const{number} Pixel density of the circle stencil used to draw the data points.
     * Defines the resolution of the circle template used to draw all data points in the canvas. It should be >1 to avoid Jaggies.
     * Large values result in a poor anti-aliasing. A value of 2 turned out to work quite well.
     */
    Lane.STENCIL_DENSITY = 2;

    /** @const{number} Left and right margin of the lane.
     * The visible area is extended by a margin to the left and right. Data points with a center outside
     * this area are not drawn. The margin should be at least the radius of a focussed point.
     */
    Lane.CLIPPING_MARGIN = Math.ceil(Lane.CIRCLE_RADIUS * 1.7);

    Lane.prototype.init = function () {
        this.xAxisScale = d3.time.scale();
        this.pendingClustering = false;
        this.pendingReposition = false;

        // nHalfHeight is the y-center of all mini tile circles.
        // It will be updated with the actual lane height / 2 in each invocation of onAfterRendering.
        this.nHalfHeight = 38;

        // Some data points are drawn in an SVG layed over the Canvas in order to easily realize mouse interactions and animations.
        // This array keeps track of those points. A data point enters this array when it gets the focus and leaves it after it losing the focus
        // and after the focus-out animation is finished.
        this._trackedPoints = [];

        // The reason to keep points in the SVG is if they are used as an anchor for a popover that opens when clicking them
        // Points in this array enter before the popover opens and leave after close.
        this._popoverPoints = [];
    };

    Lane.prototype._getSVG = function () {
        return d3.select("#" + this.getId() + " svg");
    };

    Lane.prototype.onAfterRendering = function () {
        LaneBase.prototype.onAfterRendering.apply(this, arguments);
        var that = this;

        if (this.getMinimized()) {
            var oCanvas = this.$("canvas")[0];
            var oCtx = oCanvas.getContext("2d");
            this._canvasWidth = jQuery(oCanvas).width();
            this._canvasHeight = jQuery(oCanvas).height();

            // We set the xAxisScale ourselves only when its not already set.
            // In general, we prefer updates from the parent timeline to be pixel synchronized.
            // If we try to always take our own width here to set the range, we get a wrong width due to a dynamic scrollbar which depends
            // on lanes rendered later, see hc/mri-pot#650.
            if (this.xAxisScale.range()[1] === 1) {
                this.xAxisScale.range([0, this._canvasWidth]);
            }

            // Update densities and sizes
            this._canvasDensity = window.devicePixelRatio ? window.devicePixelRatio : 1;

            // Prepare canvas for displays with a resolution that is higher than 1 pixel, e.g. Retina
            oCanvas.setAttribute("width", this._canvasWidth * this._canvasDensity);
            oCanvas.setAttribute("height", this._canvasHeight * this._canvasDensity);
            oCanvas.style.width = this._canvasWidth;
            oCanvas.style.height = this._canvasHeight;
            oCtx.scale(this._canvasDensity, this._canvasDensity);

            // Clone stroke and fill style from already visible elements and create stencil
            var sStrokeColor = jQuery("#" + this.getId() + " .sapTlTimelineLaneDescriptionTitle").css("color");
            var sFillColor = jQuery("#" + this.getId() + " .sapTlTimelineLaneBody").css("background-color");

            this._dotStencil = new CircleStencil({
                radius: Lane.CIRCLE_RADIUS,
                density: Lane.STENCIL_DENSITY * this._canvasDensity
            });
            this._dotStencil.prepareStencil(Lane.CIRCLE_RADIUS, sStrokeColor, sFillColor);

            // Set canvas line and fill styles
            oCtx.strokeStyle = sStrokeColor;
            oCtx.fillStyle = sFillColor;
            oCtx.lineWidth = 1.5;
            oCtx.lineJoin = "bevel";

            this._trackedPoints = [];
            this._popoverPoints = [];

            this.nHalfHeight = this._canvasHeight / 2;
            this.refreshMiniTiles();
            this._getSVG()
                .on("mousemove", function () {
                    that.updateFocus(d3.mouse(this));
                })
                .on("mouseout", function () {
                    that.updateFocus();
                });
        } else if (this.pendingClustering) {
            this.clusterTiles();
        } else if (this.pendingReposition) {
            this.repositionTiles();
        }
    };

    Lane.prototype.getClosestTile = function (aPosition, nMaxDistance, aTiles) {
        // Minimize distance
        if (!nMaxDistance) {
            nMaxDistance = Infinity;
        }

        if (!aTiles) {
            aTiles = this.getTiles() || [];
        }

        return aTiles.reduce(function (oMin, oTile) {
            if (oTile.isDated()) {
                var nDist = Math.abs(oTile.getLeft() - aPosition[0]);
                if (nDist < oMin.dist) {
                    oMin.dist = nDist;
                    oMin.tile = oTile;
                }
            }
            return oMin;
        }, {
            dist: nMaxDistance
        }).tile;
    };

    Lane.prototype.refreshMiniTiles = function () {
        var oCanvas = this.$("canvas")[0];

        // It could be that we get here because of getVisible() === true,
        // but the DOM is not yet existent, because of a pending rendering event
        if (!oCanvas) {
            return;
        }

        // Rendering optimization:
        // 1. Only render mini tiles that are within the viewport
        // 2. In a sequence of mini tiles that would be rendered at the same pixel, render only the first one
        var nMinPos = this.xAxisScale.range()[0] - Lane.CLIPPING_MARGIN;
        var nMaxPos = this.xAxisScale.range()[1] + Lane.CLIPPING_MARGIN;
        var nLast = nMinPos;
        var aTiles = (this.getTiles() || []).filter(function (oTile) {
            var nLeft = oTile.getLeft();
            var nPos = Math.floor(nLeft);
            if (nLast === nPos) {
                return false;
            }
            nLast = nPos;
            return nMinPos <= nLeft && nLeft <= nMaxPos;
        }, this);
        this._visibleTiles = aTiles;

        // Clear canvas
        var oCtx = oCanvas.getContext("2d");
        oCtx.clearRect(0, 0, this._canvasWidth, this._canvasHeight);

        // Render dots
        var oStencil = this._dotStencil;
        var oStencilCanvas = oStencil.getCanvas();
        var aCenter = oStencil.getCenter();
        var nWidth = oStencil.getWidth();
        var nHeight = oStencil.getHeight();
        var nY = this.nHalfHeight - aCenter[1];
        var nTiles = aTiles.length;
        for (var j = 0; j < nTiles; ++j) {
            oCtx.drawImage(oStencilCanvas, aTiles[j].getLeft() - aCenter[0], nY, nWidth, nHeight);
        }

        this.updateFocus(this._focusPosition);
    };

    Lane.prototype.updateFocus = function (aPosition) {
        this._focusPosition = aPosition;
        if (aPosition) {
            this._focusTile = this.getClosestTile(this._focusPosition, Lane.FOCUS_DISTANCE, this._visibleTiles);
        } else {
            delete this._focusTile;
        }
        this.updateFocusTile();
    };

    Lane.prototype.updateFocusTile = function () {
        var that = this;
        var nMinPos = this.xAxisScale.range()[0] - Lane.CLIPPING_MARGIN;
        var nMaxPos = this.xAxisScale.range()[1] + Lane.CLIPPING_MARGIN;

        // remove points from the lists that are no longer visible
        this._trackedPoints = this._trackedPoints.filter(function (oTile) {
            var nLeft = oTile.getLeft();
            return nMinPos <= nLeft && nLeft <= nMaxPos;
        });
        this._popoverPoints = this._popoverPoints.filter(function (oTile) {
            var nLeft = oTile.getLeft();
            return nMinPos <= nLeft && nLeft <= nMaxPos;
        });

        // Handler to remove points the tracked list and potentially from the DOM,
        // who lose their focus and whose unfocus-animation ended
        var fRemoveHandler = function (oTile) {
            var nIndex = that._trackedPoints.indexOf(oTile);
            if (nIndex !== -1) {
                that._trackedPoints.splice(nIndex, 1);
                // We can remove the DOM element only if the popover isn't using it as an anchor
                if (that._popoverPoints.indexOf(oTile) === -1) {
                    this.remove();
                }
            }
        };

        // Add current focus point to list of tracked points
        if (this._focusTile) {
            if (this._trackedPoints.indexOf(this._focusTile) === -1) {
                this._trackedPoints.push(this._focusTile);
            }
        }

        // concat the lists of tracked and popover points, while removing duplicates
        var aSVGPoints = this._trackedPoints.concat(this._popoverPoints.filter(function (oTile) {
            return this._trackedPoints.indexOf(oTile) === -1;
        }, this));

        // Render/update data points
        var oCircle = d3.select("#" + this.getId() + " svg").selectAll("g")
            .data(aSVGPoints, function (oTile) {
                return oTile.getKey();
            })
            .attr("transform", function (oTile) {
                return "translate(" + oTile.getLeft() + "," + that.nHalfHeight + ")";
            })
            .classed("focus", function (oTile) {
                return oTile === that._focusTile;
            })
            .classed("focusInit", false)
            .on("transitionend", fRemoveHandler);

        var oGroup = oCircle.enter()
            .append("g")
            .attr("transform", function (oTile) {
                return "translate(" + oTile.getLeft() + "," + that.nHalfHeight + ")";
            })
            .classed("focus", true)
            .classed("focusInit", true)
            .on("transitionend", fRemoveHandler);

        oGroup.append("circle")
            .attr("r", Lane.CIRCLE_RADIUS)
            .on("click", function (oTile) {
                var xPos = oTile.getLeft();
                var aCloseTiles = that.getTiles().filter(function (oTileOther) {
                    var xPosOther = oTileOther.getLeft();
                    // Aggregate tiles that are less than a pixel away
                    return xPos - 1 < xPosOther && xPosOther < xPos + 1;
                });
                var oHook = d3.select(this.parentNode).select(".sapTlTimelineChartDotHook");
                var oPopover = oTile.openTilePopover(oHook[0][0], aCloseTiles);
                that._popoverPoints.push(oTile);

                // Attach a on-after-close handler to remove the anchor point from the list we keep in the SVG
                oPopover.attachEventOnce("afterClose", function () {
                    var index = that._popoverPoints.indexOf(oTile);
                    if (index !== -1) {
                        that._popoverPoints.splice(index, 1);
                        that.updateFocusTile();
                    }
                });
            });

        // Add a circle with radius 0 as a centered anchor for the popover.
        // The circle above cannot be used as it changes its radius on hover and the popover would move
        oGroup.append("circle")
            .classed("sapTlTimelineChartDotHook", true);

        oCircle.exit()
            .remove();

        // All but the focus point will be removed after their animation finishes
        d3.select("#" + this.getId() + " svg").selectAll("g.focus")
            .on("transitionend", null);
    };

    /**
     * Reposition tiles by a fixed date delta.
     */
    Lane.prototype.repositionTiles = function () {
        this.pendingReposition = false;
        this.getTiles().forEach(function (oTile) {
            oTile.reposition(this.xAxisScale);
        }, this);
    };

    /**
     * Extract a list of tile outlines from a list of tiles.
     *
     * @param   {ps.app.ui.lib.Tile[]}  aTiles Array of tiles from which the outlines should be extracted.
     * @returns {Object[]}  Array of tiles' outlines, i.e., pixel coordinates of start and end times.
     *                   Example: [{pixelStartTime: 120, pixelEndTime: 350}, ...]
     * @private
     */
    Lane._extractTilesOutlines = function (aTiles) {
        return aTiles.map(function (oTile) {
            return {
                pixelStartTime: oTile.getLeft(),
                pixelEndTime: oTile.getRight()
            };
        });
    };

    /**
     * Cluster tiles that would visually overlap. Compared tile coordinates (left, right, width) are in pixels, hence
     * the clustering of tiles is zoom-dependent.
     *
     * @param   {array}  aTileOutlines Array of tile outlines, i.e., pixel coordinates of start and end times.
     *                   Tiles must be sorted chronologically by their starting date.
     *                   Example: [{pixelStartTime: 120, pixelEndTime: 350}, ...]
     * @param   {number} iMinTileWidth The minimum width of tiles in pixels.
     * @param   {number} iMinTileDistance The minimum distance between two tiles in pixels.
     * @returns {array}  Array of arrays of indices into the aTiles array.
     *                   Example: [[1, 2], [3, 4, 5], [6, 7]]
     * @private
     */
    Lane._clusterOverlappingTilesLeftToRight = function (aTileOutlines, iMinTileWidth, iMinTileDistance) {
        var aTileClusters = [];
        var aCurrentCluster = [];
        var iCurrentTileRight = 0;

        aTileOutlines.forEach(function (mTileOutline, index) {
            // Always start new visible tile cluster from first tile
            // Iterate over rest of tiles, adding them to current cluster OR starting a new
            // cluster based on their overlap with the current cluster
            if (index === 0 || iCurrentTileRight + iMinTileDistance <= mTileOutline.pixelStartTime) {
                // start new tile cluster
                aCurrentCluster = [];
                aTileClusters.push(aCurrentCluster);
                aCurrentCluster.push(index);
                iCurrentTileRight = Math.max(mTileOutline.pixelEndTime, mTileOutline.pixelStartTime + iMinTileWidth);
            } else {
                // add tile to current tile cluster
                aCurrentCluster.push(index);
                iCurrentTileRight = Math.max(iCurrentTileRight, mTileOutline.pixelEndTime);
            }
        });

        return aTileClusters;
    };

    /**
     * Applies a list of tile clusters to a list of tiles.
     *
     * @param   {ps.app.ui.lib.Tile[]}  aTiles Array of tiles that the clustering is applied to.
     * @param   {array}  aTileClusters Array of arrays of indices into the aTiles array.
     *                   Example: [[1, 2], [3, 4, 5], [6, 7]]
     * @private
     */
    Lane._applyTileClustering = function (aTiles, aTileClusters) {
        var oCurrentTile = null;
        var oClusterTile = null;

        aTileClusters.forEach(function (aClusteredTilesIndices) {
            // Always make first tile in cluster the visible cluster tile representing the other tiles
            oClusterTile = aTiles[aClusteredTilesIndices[0]];
            if (!oClusterTile.getVisible()) {
                oClusterTile.setVisible(true);
            }
            oClusterTile.removeAllHiddenTiles();

            // Iterate over rest of tiles, adding them to current cluster tile
            aClusteredTilesIndices.slice(1).forEach(function (iTileIndex) {
                oCurrentTile = aTiles[iTileIndex];
                oCurrentTile.removeAllHiddenTiles();
                if (oCurrentTile.getVisible()) {
                    oCurrentTile.setVisible(false);
                }
                // add tile to current cluster
                oClusterTile.addHiddenTile(oCurrentTile);
            });
            // finish tile cluster
            oClusterTile.invalidate();
        });
    };

    /**
     * Run the clustering algorithm on the Tiles in this Lane.
     * The Tiles are devided into two list, the ones with valid dates and the ones without.
     * Actual clustering is only applied to dated Tiles.
     */
    Lane.prototype.clusterTiles = function () {
        var aDatedTiles = [];
        var aUndatedTiles = [];
        this.pendingReposition = false;
        this.pendingClustering = false;
        this.getTiles().forEach(function (oTile) {
            if (oTile.isDated()) {
                aDatedTiles.push(oTile);
            } else {
                aUndatedTiles.push(oTile);
            }
        });

        if (aDatedTiles.length) {
            var aTileOutlines = Lane._extractTilesOutlines(aDatedTiles);
            var aTileClusters = Lane._clusterOverlappingTilesLeftToRight(aTileOutlines, Tile.MIN_WIDTH, Lane.MIN_TILE_DISTANCE);
            Lane._applyTileClustering(aDatedTiles, aTileClusters);
        }

        if (aUndatedTiles.length) {
            aUndatedTiles[0].removeAllHiddenTiles();
            aUndatedTiles.forEach(function (oTile, iIndex) {
                if (iIndex > 0) {
                    if (oTile.getVisible()) {
                        oTile.setVisible(false);
                    }
                    aUndatedTiles[0].addHiddenTile(oTile);
                }
            });
            aUndatedTiles[0].invalidate();
        }
    };

    Lane.prototype.reposition = function (oScale) {
        this.xAxisScale = oScale.copy();
        this.pendingReposition = true;
        if (this.getVisible()) {
            if (this.getMinimized()) {
                this.refreshMiniTiles();
            } else {
                this.repositionTiles();
            }
        }
        LaneBase.prototype.reposition.apply(this, arguments);
    };

    Lane.prototype.rearrange = function (oScale) {
        this.xAxisScale = oScale.copy();
        this.pendingClustering = true;
        if (this.getVisible()) {
            if (this.getMinimized()) {
                this.refreshMiniTiles();
            } else {
                this.clusterTiles();
            }
        }
        LaneBase.prototype.rearrange.apply(this, arguments);
    };

    return Lane;
});
