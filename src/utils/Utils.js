sap.ui.define([
    "jquery.sap.global",
    "./ScopedUtils"
], function (jQuery, ScopedUtils) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for PS Application.
     * @deprecated Use *Utils directly or create a scoped instance using ScopedUtils.
     * @extends ps.app.ui.utils.ScopedUtils
     * @alias ps.app.ui.utils.Util
     */
    var Util = new ScopedUtils("ps.app.ui");

    return Util;
}, true);
