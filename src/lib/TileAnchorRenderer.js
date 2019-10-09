sap.ui.define([
    "sap/ui/core/Renderer"
], function (Renderer) {
    "use strict";

    /**
     * Tile Anchor renderer.
     * @namespace
     */
    var TileAnchorRenderer = Renderer.extend("ps.app.ui.lib.TileAnchorRenderer");

    TileAnchorRenderer.render = function (oRenderManager, oAnchor) {
        var oTile = oAnchor.getParent();
        var nLeft = oTile.getLeft();
        var nWidth = oTile.getWidth();

        // render an invisible anchor for the popover
        if (nLeft < 0) {
            nWidth += nLeft;
            nLeft = 0;
        }

        oRenderManager.write("<div");
        oRenderManager.writeControlData(oAnchor);
        oRenderManager.addClass("sapTlTileAnchor");
        oRenderManager.writeClasses();
        if (nWidth > 0) {
            oRenderManager.addStyle("left", nLeft + "px");
            oRenderManager.addStyle("width", nWidth + "px");
            oRenderManager.addStyle("max-width", "calc(100% - " + nLeft + "px)");
            oRenderManager.writeStyles();
        }
        oRenderManager.write("/>");
    };

    return TileAnchorRenderer;
}, true);
