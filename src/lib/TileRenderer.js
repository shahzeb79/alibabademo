sap.ui.define([
    "./Tile"
], function (Tile) {
    "use strict";

    /**
     * Tile renderer.
     * @namespace
     */
    var TileRenderer = {};

    /**
     * Renders the HTML for the given control, using the provided {@link sap.ui.core.RenderManager}.
     * @param {sap.ui.core.RenderManager}      oRenderManager the RenderManager that can be used for writing to the
     *                                                        Render-Output-Buffer
     * @param {ps.app.ui.lib.Tile} oTile          an object representation of the control that should be
     *                                                        rendered
     */
    TileRenderer.render = function (oRenderManager, oTile) {
        oRenderManager.write("<div");
        oRenderManager.writeControlData(oTile);
        oRenderManager.addClass("sapTlTileUmbrella");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.writeAttribute("id", oTile.getId() + "-tile");
        oRenderManager.writeAttribute("tabindex", "0");
        oRenderManager.addClass("sapTlTile");
        if (oTile.isMultiple()) {
            oRenderManager.addClass("sapTlTileMultiple");
            oRenderManager.addClass("sapTlTileStacked");
        }
        if (!oTile.isDated()) {
            oRenderManager.addClass("sapTlTileUndated");
        }
        oRenderManager.writeClasses();
        oRenderManager.addStyle("left", oTile.getLeft() + "px");
        oRenderManager.addStyle("width", oTile.getWidth() + "px");
        oRenderManager.writeStyles();
        oRenderManager.write(">");

        // draw time indicators
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTileDots");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oTile.getTimeIndicators().forEach(function (oTimeIndicator) {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlTileDot");
            oRenderManager.writeClasses();
            oRenderManager.addStyle("left", oTimeIndicator.left - oTile.getLeft() + "px");
            oRenderManager.addStyle("width", oTimeIndicator.width + "px");
            oRenderManager.writeStyles();
            oRenderManager.write("></div>");
        });
        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTilePaddedArea");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTileTitle");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        if (oTile.isMultiple()) {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlTileBadge");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.writeEscaped(oTile.getBadgeCount().toString());
            oRenderManager.write("</div>");
        }

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTileTitleText");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oTile.getDisplayName());
        oRenderManager.write("</div>");

        oRenderManager.write("</div>"); // sapTlTileTitle

        if (oTile.isMultiple()) {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlTileSimpleDetails");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oRenderManager.writeEscaped(oTile.getSimpleDetails());
            oRenderManager.write("</div>");
        } else {
            oRenderManager.write("<div");
            oRenderManager.addClass("sapTlTileDetails");
            oRenderManager.writeClasses();
            oRenderManager.write(">");
            oTile.getMainAttributes().forEach(function (oTileAttribute) {
                TileRenderer.renderAttribute(oRenderManager, oTileAttribute);
            });
            oRenderManager.write("</div>");
        }

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTileTime");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(oTile.getTime());
        oRenderManager.write("</div>");

        oRenderManager.write("</div>"); // sapTlTilePaddedArea
        oRenderManager.write("</div>"); // sapTlTile

        oRenderManager.renderControl(oTile.getAggregation("_anchor"));

        oRenderManager.write("</div>"); // sapTlTileUmbrella
    };

    TileRenderer.renderAttribute = function (oRenderManager, oTileAttribute) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTileDetailsRow");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTileDetailsCell");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(Tile.getAttributeName(oTileAttribute));
        oRenderManager.write("</div>");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTileDetailsCell");
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        oRenderManager.writeEscaped(Tile.getAttributeValues(oTileAttribute).join(", "));
        oRenderManager.write("</div>");

        oRenderManager.write("</div>");
    };

    return TileRenderer;
}, true);
