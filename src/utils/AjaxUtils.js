sap.ui.define([
    "jquery.sap.global"
], function (jQuery) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Ajax related functionality.
     * @alias ps.app.ui.utils.AjaxUtils
     */
    var AjaxUtils = {};

    /**
     * This is a wrapper for the jQuery.ajax function, allowing us to easily add additional
     * information to the call, when required (e.g. XSRF token, JWT, etc).
     * Callbacks should be attached by using .done(), .fail() or .always().
     * @param   {string|object}   vOptions URL or settings object for jQuery.ajax()
     * @returns {jQuery.Deferred} Deferred object being resolved or rejected when the request returns.
     */
    AjaxUtils.ajax = function (vOptions) {
        return jQuery.ajax(vOptions);
    };

    return AjaxUtils;
});
