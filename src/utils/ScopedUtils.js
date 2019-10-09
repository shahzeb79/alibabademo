sap.ui.define([
    "jquery.sap.global",
    "./AjaxUtils",
    "./DateUtils",
    "./FioriUtils",
    "./JSONUtils",
    "./TextUtils",
    "./UserPrefsUtils",
    "./UserStateHandler"
], function (jQuery, AjaxUtils, DateUtils, FioriUtils, JSONUtils, TextUtils, UserPrefsUtils, UserStateHandler) {
    "use strict";

    /**
     * Creates a new ScopedUtils object.
     * @constructor
     * @param {string} sScope The scope should be a unique string which describes the namespace where the object will be used. For this namespace it could be <code>hph.core</core>.
     * @param {jQuery.sap.util.ResourceBundle|string} [vResource] Optionally set the ResourceBundle on construction by providing either the ResourceBundle or a path.
     * @param {ps.app.ui.utils.FioriUtils.DensityClass[]} [aSupportedDensityClasses] Optionally set the supported density classes on construction.
     *
     * @classdesc
     * Scoped Utility class. Scoped means that the TextUtils functions will automatically work with the ResourceBundle
     * that is connected to that scope. Applications should create their own Utils object which extends this one and
     * enhances it with more specific utility functions.
     * @alias ps.app.ui.utils.ScopedUtils
     * @borrows ps.app.ui.utils.AjaxUtils.ajax as ajax
     * @borrows ps.app.ui.utils.DateUtils.formatDate as formatDate
     * @borrows ps.app.ui.utils.DateUtils.formatDateTime as formatDateTime
     * @borrows ps.app.ui.utils.DateUtils.formatISODate as formatISODate
     * @borrows ps.app.ui.utils.DateUtils.parseDate as parseDate
     * @borrows ps.app.ui.utils.DateUtils.parseDateTime as parseDateTime
     * @borrows ps.app.ui.utils.DateUtils.parseHANADate as parseHANADate
     * @borrows ps.app.ui.utils.DateUtils.parseISODate as parseISODate
     * @borrows ps.app.ui.utils.DateUtils.getUserPrefsDateTimePattern as getUserPrefsDateTimePattern
     * @borrows ps.app.ui.utils.DateUtils.getUserPrefsDatePattern as getUserPrefsDatePattern
     * @borrows ps.app.ui.utils.DateUtils.getISODatePattern as getISODatePattern
     * @borrows ps.app.ui.utils.DateUtils.localToUtc as localToUtc
     * @borrows ps.app.ui.utils.DateUtils.utcToLocal as utcToLocal
     * @borrows ps.app.ui.utils.JSONUtils.clone as cloneJson
     * @borrows ps.app.ui.utils.JSONUtils.createPathInObject as createPathInObject
     * @borrows ps.app.ui.utils.JSONUtils.getJsonWalkFunction as getJsonWalkFunction
     * @borrows ps.app.ui.utils.JSONUtils.getPropertyByPath as getPropertyByPath
     * @borrows ps.app.ui.utils.JSONUtils.hashJSON as hashJSON
     * @borrows ps.app.ui.utils.UserPrefsUtils.getUserPreference as getUserPreference
     */
    var ScopedUtils = function (sScope, vResource, aSupportedDensityClasses) {
        if (typeof sScope === "undefined") {
            throw new Error("Scope cannot be undefined.");
        }
        this._sScope = sScope;
        if (Array.isArray(vResource) && typeof aSupportedDensityClasses === "undefined") {
            aSupportedDensityClasses = vResource;
        } else if (typeof vResource === "object") {
            this.setResourceBundle(vResource);
        } else if (typeof vResource === "string") {
            this.loadResourceBundle(vResource);
        }
        if (Array.isArray(aSupportedDensityClasses)) {
            this.setSupportedDensityClasses(aSupportedDensityClasses);
        }
    };

    ScopedUtils.prototype.ajax = AjaxUtils.ajax;

    ScopedUtils.prototype.formatDate = DateUtils.formatDate;

    ScopedUtils.prototype.formatDateTime = DateUtils.formatDateTime;

    ScopedUtils.prototype.formatISODate = DateUtils.formatISODate;

    ScopedUtils.prototype.parseDate = DateUtils.parseDate;

    ScopedUtils.prototype.parseDateTime = DateUtils.parseDateTime;

    ScopedUtils.prototype.parseHANADate = DateUtils.parseHANADate;

    ScopedUtils.prototype.parseISODate = DateUtils.parseISODate;

    ScopedUtils.prototype.getUserPrefsDateTimePattern = DateUtils.getUserPrefsDateTimePattern;

    ScopedUtils.prototype.getUserPrefsDatePattern = DateUtils.getUserPrefsDatePattern;

    ScopedUtils.prototype.getISODatePattern = DateUtils.getISODatePattern;

    ScopedUtils.prototype.localToUtc = DateUtils.localToUtc;

    ScopedUtils.prototype.utcToLocal = DateUtils.utcToLocal;

    ScopedUtils.prototype.cloneJson = JSONUtils.clone;

    ScopedUtils.prototype.createPathInObject = JSONUtils.createPathInObject;

    ScopedUtils.prototype.hashJSON = JSONUtils.hashJSON;

    ScopedUtils.prototype.getJsonWalkFunction = JSONUtils.getJsonWalkFunction;

    ScopedUtils.prototype.getPropertyByPath = JSONUtils.getPropertyByPath;

    ScopedUtils.prototype.getUserPreference = UserPrefsUtils.getUserPreference;

    /**
     * Get the content density class to be set on Views and Dialogs.
     * If the class has already been set by the launchpad, an empty string will be returned.
     * @returns {ps.app.ui.utils.FioriUtils.DensityClass} Content density class or an empty string.
     */
    ScopedUtils.prototype.getContentDensityClass = function () {
        return FioriUtils.getContentDensityClass(this._sScope);
    };

    /**
     * Set the list of supported density classes for a given scope.
     * The list has to contain at least one entry.
     * @param {ps.app.ui.utils.FioriUtils.DensityClass[]} aSupportedDensityClasses List of supported classes
     */
    ScopedUtils.prototype.setSupportedDensityClasses = function (aSupportedDensityClasses) {
        FioriUtils.setSupportedDensityClasses(this._sScope, aSupportedDensityClasses);
    };

    /**
     * Set the ResourceBundle.
     * Provides a static access to the ResourceBundle.
     * @see ps.app.ui.utils.TextUtils.setResourceBundle
     * @param {jQuery.sap.util.ResourceBundle} oResouceBundle I18n-ResouceBundle of the MRI-PA-Component
     */
    ScopedUtils.prototype.setResourceBundle = function (oResouceBundle) {
        TextUtils.setResourceBundle(this._sScope, oResouceBundle);
    };

    /**
     * Load and set the ResourceBundle.
     * Provides a static access to the ResourceBundle.
     * @see ps.app.ui.utils.TextUtils.loadResourceBundle
     * @param {string} sPath Path to the resource file
     */
    ScopedUtils.prototype.loadResourceBundle = function (sPath) {
        TextUtils.loadResourceBundle(this._sScope, sPath);
    };

    /**
     * Wrapper around ResouceBundle.getText().
     * Checks if a ResourceBundle has been set and if so returns the translated string.
     * If text parameters are given, then any occurrences of the pattern "{<i>n</i>}" with <i>n</i> being an integer
     * are replaced by the parameter value with index <i>n</i>.
     * @see ps.app.ui.utils.TextUtils.getText
     * @param   {string}   sKey    Key of the translatable string
     * @param   {string[]} [aArgs] List of parameters which should replace the place holders
     * @returns {string}   The value belonging to the key, if found; otherwise the key itself.
     */
    ScopedUtils.prototype.getText = function (sKey, aArgs) {
        return TextUtils.getText(this._sScope, sKey, aArgs);
    };

    /**
     * Notifies the user using either a (modal) MessageBox or a MessageToast.
     * The method of notification depends on the level of the message.
     * For "warning" and "error" a MessageBox is opened, to prevent any user from missing it.
     * For any other kind of notification (e.g. "success" or "info"),
     * the MessageToast provides an non-interruptive notification.
     * @see ps.app.ui.utils.TextUtils.notifyUser
     * @param {sap.ui.core.MessageType} sLevel              Notification level, decides the method of notification
     * @param {string}                  sMessageKey         The message key of the notification
     * @param {function}                [fMessageBoxClosed] Optional callback function for MessageBox closed
     */
    ScopedUtils.prototype.notifyUser = function (sLevel, sMessageKey, fMessageBoxClosed) {
        TextUtils.notifyUser(sLevel, this.getText(sMessageKey), fMessageBoxClosed);
    };

    var userStateHandler = new UserStateHandler();
    ScopedUtils.prototype.setState = userStateHandler.setState.bind(userStateHandler);
    ScopedUtils.prototype.getState = userStateHandler.getState.bind(userStateHandler);

    return ScopedUtils;
});
