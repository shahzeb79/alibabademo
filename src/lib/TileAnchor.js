sap.ui.define([
    "sap/ui/core/Control"
], function (Control) {
    "use strict";
    /**
     * Constructor for a new Tile Anchor.
     *
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @class
     * The Tile Anchor control is an invisible control that is used to anchor the Tile Popover.
     * The Tile itself cannot be used directly as it can be too large and cause weird effects.
     * See https://github.wdf.sap.corp/hc/mri-pot/issues/795
     *
     * @extends sap.ui.core.Control
     *
     * @author SAP SE
     * @version 1.0.0
     *
     * @constructor
     * @alias ps.app.ui.lib.TileAnchor
     */

    var TileAnchor = Control.extend("ps.app.ui.lib.TileAnchor");

    return TileAnchor;
});
