sap.ui.define([
    "jquery.sap.global",
    "./UserPrefsUtils",
    "sap/ui/core/format/DateFormat"
], function (jQuery, UserPrefsUtils, DateFormat) {
    "use strict";

    /**
     * @namespace
     * @classdesc Utility class for Date related functionality.
     * @alias ps.app.ui.utils.DateUtils
     */
    var DateUtils = {};

    /**
     * Formats a date object using the default date format
     * @param   {Date}    dDate     The date to be formatted
     * @param   {boolean} bLocalize Flag to control if the date should be formatted with the local time
     *                              zone (true) or to UTC (false). The default value is false.
     * @returns {string}  A string representing the date in the default date format
     */
    DateUtils.formatDate = function (dDate, bLocalize) {
        return DateUtils._getDateFormatter().format(dDate, !bLocalize);
    };

    /**
     * Formats a date object using the default date-time format
     * @param   {Date}    dDate     The date to be formatted
     * @param   {boolean} bLocalize Flag to control if the date should be formatted with the local time
     *                              zone (true) or to UTC (false). The default value is false.
     * @returns {string}  A string representing the date in the default date-time format
     */
    DateUtils.formatDateTime = function (dDate, bLocalize) {
        return DateUtils._getDateTimeFormatter().format(dDate, !bLocalize);
    };

    /**
     * Formats a date object as ISO string ("yyyy-MM-dd'T'HH:mm:ss.SSSX")
     * @param   {string}  sDate     The date to be formatted
     * @param   {boolean} bLocalize Flag to control if the date should be formatted with the local time
     *                              zone (true) or to UTC (false). The default value is false.
     * @returns {string}  A string representing the date in ISO format
     */
    DateUtils.formatISODate = function (sDate, bLocalize) {
        return DateUtils._getISODateFormatter().format(sDate, !bLocalize);
    };

    /**
     * Parses a date string in the default date format
     * @param   {string}  sDate The string to be parsed as date
     * @param   {boolean} bUTC  Flag to control if the given string represents a date in UTC or
     *                          in the local time zone. The default value is false.
     * @returns {Date}    A new date object
     */
    DateUtils.parseDate = function (sDate, bUTC) {
        return DateUtils._getDateFormatter().parse(sDate, bUTC);
    };

    /**
     * Parses a date and time string in the default date-time format
     * @param   {string}  sDate The string to be parsed as date
     * @param   {boolean} bUTC  Flag to control if the given string represents a date in UTC or
     *                          in the local time zone. The default value is false.
     * @returns {Date}    A new date object
     */
    DateUtils.parseDateTime = function (sDate, bUTC) {
        return DateUtils._getDateTimeFormatter().parse(sDate, bUTC);
    };

    /**
     * Parses a date string in HANA format ("yyyy-MM-dd HH:mm:ss.SSSSSSS")
     * @param   {string} sDate The string to be parsed as date
     * @returns {Date}   A new date object
     */
    DateUtils.parseHANADate = function (sDate) {
        return DateUtils._getHANADateFormatter().parse(sDate, true);
    };

    /**
     * Parses a date string in ISO format.
     * @param   {string} sDate The string to be parsed as date
     * @returns {Date}   A new date object
     */
    DateUtils.parseISODate = function (sDate) {
        return DateUtils._getISODateFormatter().parse(sDate, true);
    };

    /**
     * Returns the default date format.
     * @returns {string} The pattern to be used for date formatting/parsing
     */
    DateUtils.getUserPrefsDatePattern = function () {
        return UserPrefsUtils.getUserPreference("DATE_FORMAT");
    };

    /**
     * Returns the default time format.
     * @returns {string} The pattern to be used for time formatting/parsing
     */
    DateUtils.getUserPrefsTimePattern = function () {
        return UserPrefsUtils.getUserPreference("TIME_FORMAT");
    };

    /**
     * Returns the default date-time format.
     * The pattern is obtained by concatenating the user date pattern with the user time pattern and using
     * a white space as separator.
     * @returns {string} The pattern to be used for date time formatting/parsing
     */
    DateUtils.getUserPrefsDateTimePattern = function () {
        var sDatePattern = DateUtils.getUserPrefsDatePattern();
        var sTimePattern = DateUtils.getUserPrefsTimePattern();
        if (sDatePattern && sTimePattern) {
            return sDatePattern + " " + sTimePattern;
        }
    };

    /**
     * Returns the pattern to be used for formatting/parsing ISO format.
     * @returns {string} The pattern to be used for ISO format
     */
    DateUtils.getISODatePattern = function () {
        return "yyyy-MM-dd'T'HH:mm:ss.SSSX";
    };

    /**
     * Creates a new date object based on an input date object. The new date object has the following property:
     * calling toUTCString on the new date would give the same value as calling toString on the initial date (except the time zone)
     * Of course, this changes the absolute value. To be used carefully.
     * @param   {Date} dDate The date to be used
     * @returns {Date} A new (modified) Date object or the initial (unmodified) object if the input is not a valid date object
     */
    DateUtils.localToUtc = function (dDate) {
        if (dDate instanceof Date && !isNaN(dDate.getTime())) {
            var offset = dDate.getTimezoneOffset() * 60000;
            return new Date(dDate.getTime() - offset);
        } else {
            return dDate;
        }
    };

    /**
     * Creates a new date object based on an input date object. The new date object has the following property:
     * calling toString on the new date would give the same value as calling toUTCString on the initial date (except the time zone)
     * Of course, this changes the absolute value. To be used carefully.
     * @param   {Date} dDate The date to be used
     * @returns {Date} A new (modified) Date object or the initial (unmodified) object if the input is not a valid date object
     */
    DateUtils.utcToLocal = function (dDate) {
        if (dDate instanceof Date && !isNaN(dDate.getTime())) {
            var offset = dDate.getTimezoneOffset() * 60000;
            return new Date(dDate.getTime() + offset);
        } else {
            return dDate;
        }
    };

    DateUtils._getDateFormatter = function () {
        var sDatePattern = DateUtils.getUserPrefsDatePattern();
        if (sDatePattern) {
            DateUtils.oLocaleDateFormat = DateFormat.getDateInstance({
                pattern: sDatePattern
            });
        } else {
            // if no user pattern is found use the default formatter (locale dependent)
            DateUtils.oLocaleDateFormat = DateFormat.getDateInstance();
        }
        return DateUtils.oLocaleDateFormat;
    };

    DateUtils._getDateTimeFormatter = function () {
        var sDateTimePattern = DateUtils.getUserPrefsDateTimePattern();
        if (sDateTimePattern) {
            DateUtils.oLocaleDateTimeFormat = DateFormat.getDateTimeInstance({
                pattern: sDateTimePattern
            });
        } else {
            // if no user pattern is found use the default formatter (locale dependent)
            DateUtils.oLocaleDateTimeFormat = DateFormat.getDateTimeInstance();
        }
        return DateUtils.oLocaleDateTimeFormat;
    };

    DateUtils._getHANADateFormatter = function () {
        if (!DateUtils.oHANADateFormat) {
            DateUtils.oHANADateFormat = DateFormat.getDateInstance({
                pattern: "yyyy-MM-dd HH:mm:ss.SSSSSSS"
            });
        }
        return DateUtils.oHANADateFormat;
    };

    DateUtils._getISODateFormatter = function () {
        if (!DateUtils.oISODateFormat) {
            DateUtils.oISODateFormat = DateFormat.getDateInstance({
                pattern: DateUtils.getISODatePattern()
            });
        }
        return DateUtils.oISODateFormat;
    };

    return DateUtils;
});
