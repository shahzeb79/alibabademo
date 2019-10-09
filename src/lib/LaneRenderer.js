sap.ui.define([
    "sap/ui/core/Renderer",
    "ps/app/ui/lib/LaneBaseRenderer"
], function (Renderer, LaneBaseRenderer) {
    "use strict";

    /**
     * Lane renderer.
     * @namespace
     */
    var LaneRenderer = Renderer.extend("ps.app.ui.lib.LaneRenderer");

    LaneRenderer.render = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneFamily");
        oRenderManager.writeControlData(oLane);
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLane");
        oRenderManager.addClass("sapTlTimelineLaneFramed");
        if (oLane.getMinimized()) {
            oRenderManager.addClass("sapTlTimelineLaneMinimized");
        }
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        LaneBaseRenderer.renderHeader(oRenderManager, oLane);
        LaneRenderer.renderBody(oRenderManager, oLane);
        oRenderManager.write("</div>");

        LaneBaseRenderer.renderSubLanes(oRenderManager, oLane);

        oRenderManager.write("</div>");
    };

    LaneRenderer.renderBody = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.writeAttribute("id", oLane.getId() + "-body");
        oRenderManager.addClass("sapTlTimelineLaneBody");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        if (!oLane.getMinimized()) {
            LaneRenderer.renderTiles(oRenderManager, oLane);
        } else {
            oRenderManager.write("<canvas");
            oRenderManager.writeAttribute("id", oLane.getId() + "-canvas");
            oRenderManager.write("/><svg");
            oRenderManager.addClass("sapTlTimelineLaneMinimized" + oLane.getColor());
            oRenderManager.writeClasses();
            oRenderManager.write("></svg>");
        }

        oRenderManager.write("</div>");
    };

    LaneRenderer.renderTiles = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTiles");
        oRenderManager.addClass("sapTlTiles" + oLane.getColor());
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oLane.getTiles().forEach(function (oTile) {
            oRenderManager.renderControl(oTile);
        });

        oRenderManager.write("</div>");
    };

    return LaneRenderer;
}, true);
