sap.ui.define([], function () {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for User Preferences related functionality.
     * @alias ps.app.ui.utils.UserPrefsUtils
     */
    var UserPrefsUtils = {};

    UserPrefsUtils._mPrefs = {
        EMAIL_ADDRESS: "ALICE@sap.com",
        LOCALE: "en",
        DATE_FORMAT: null,
        TIME_FORMAT: null
    };

    /**
     * Synchronously request a particular user preference for the current user.
     * A request to the backend service is fired only the first time, the preferences are then cached.
     * @param   {string} sPreferenceId The string identifying the desired preference
     * @returns {any}    The preference value
     */
    UserPrefsUtils.getUserPreference = function (sPreferenceId) {
        return UserPrefsUtils._mPrefs[sPreferenceId];
    };

    return UserPrefsUtils;
});
