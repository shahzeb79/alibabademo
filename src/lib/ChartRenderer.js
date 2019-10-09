sap.ui.define([
    "sap/ui/core/Renderer",
    "ps/app/ui/lib/LaneBaseRenderer"
], function (Renderer, LaneBaseRenderer) {
    "use strict";

    /**
     * Lane renderer.
     * @namespace
     */
    var ChartRenderer = Renderer.extend("ps.app.ui.lib.ChartRenderer");

    ChartRenderer.render = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneFamily");
        oRenderManager.writeControlData(oLane);
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLane");
        oRenderManager.addClass("sapTlTimelineLaneFramed");
        oRenderManager.addClass("sapTlTimelineChart");
        if (oLane.getMinimized()) {
            oRenderManager.addClass("sapTlTimelineLaneMinimized");
        }
        oRenderManager.writeClasses();
        oRenderManager.write(">");
        LaneBaseRenderer.renderHeader(oRenderManager, oLane);
        ChartRenderer.renderBody(oRenderManager, oLane);
        oRenderManager.write("</div>");

        LaneBaseRenderer.renderSubLanes(oRenderManager, oLane);

        oRenderManager.write("</div>");
    };

    ChartRenderer.renderBody = function (oRenderManager, oLane) {
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineLaneBody");
        oRenderManager.writeClasses();
        oRenderManager.write(">");

        oRenderManager.write("<canvas");
        oRenderManager.writeAttribute("id", oLane.getId() + "-canvas");
        oRenderManager.write("/><svg>");
        oRenderManager.write("<g");
        oRenderManager.addClass("sapTlTimelineChartLine");
        oRenderManager.writeClasses();
        oRenderManager.write("></g>");
        oRenderManager.write("<g");
        oRenderManager.addClass("sapTlTimelineChartDots");
        oRenderManager.writeClasses();
        oRenderManager.write("></g>");
        oRenderManager.write("</svg>");
        oRenderManager.write("<div");
        oRenderManager.addClass("sapTlTimelineChartLabels");
        oRenderManager.writeClasses();
        oRenderManager.write("></div>");

        oRenderManager.write("</div>");
    };

    return ChartRenderer;
}, true);
