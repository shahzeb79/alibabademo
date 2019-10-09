sap.ui.define([
    "jquery.sap.global",
    "sap/m/Dialog",
    "sap/m/Toolbar"
], function (jQuery, Dialog, Toolbar) {
    "use strict";

    /**
     * Constructor for a new ConfigDialog.
     * @constructor
     * @param {string} [sId]       id for the new control, generated automatically if no id is given
     * @param {object} [mSettings] initial settings for the new control
     *
     * @classdesc
     * The ConfigDialog is an extended Dialog that allows more flexibility in the footer.
     * @extends sap.m.Dialog
     * @implements sap.ui.core.PopupInterface
     * @alias ps.app.ui.lib.ConfigDialog
     */
    var ConfigDialog = Dialog.extend("ps.app.ui.lib.ConfigDialog", {
        metadata: {
            interfaces: [
                "sap.ui.core.PopupInterface"
            ],
            library: "ps.app.ui.lib",
            aggregations: {
                /**
                 * Footer content can be added to the footer area of dialog through this aggregation.
                 * Note, the footer is only shown when there is more than one control added to it.
                 */
                footer: {
                    type: "sap.ui.core.Control",
                    multiple: true,
                    singularName: "footer"
                }
            }
        },
        renderer: {}
    });

    /**
     * Return the internal footer Toolbar.
     * If it doesn't exist, it will be created.
     * @private
     * @override
     * @returns {sap.m.Toolbar} Internal footer Toolbar.
     */
    ConfigDialog.prototype._getToolbar = function () {
        if (!this._oToolbar) {
            var that = this;
            this._oToolbar = new Toolbar(this.getId() + "-footer")
                .addStyleClass("sapMTBNoBorders")
                .addStyleClass("sapFFHConfigDialogToolbar")
                .applyTagAndContextClassFor("footer");
            // Buttons are now added to the Toolbar and Toolbar is the parent of the button
            // There's already code written on button:
            // oButton.getParent().close()
            // which worked before because dialog was the parent of the button. But now because button's parent is toolbar
            // and in order not to bread the existing code, the close method on the parent is created in which the close method
            // is forwarded to the dialog.
            this._oToolbar.close = function () {
                jQuery.sap.log.error("Function 'close' is called on the internal Toolbar instance instead of the Dialog instance with id '" + that.getId() + "'. Although the function call is forwarded to the Dialog instance, the 'close' function should be called on the Dialog instance directly.");
                that.close();
            };
            this.setAggregation("_toolbar", this._oToolbar);
        }
        return this._oToolbar;
    };

    /**
     * Add a Control to the footer.
     * @override
     * @param   {sap.ui.core.Control}             oControl The control to add
     * @returns {ps.app.ui.lib.ConfigDialog} Reference to this in order to allow method chaining.
     */
    ConfigDialog.prototype.addFooter = function (oControl) {
        this._getToolbar().addContent(oControl);
        return this;
    };

    /**
     * Destroy all Controls in the footer.
     * @override
     * @param   {sap.ui.core.Control}             oControl The control to add
     * @returns {ps.app.ui.lib.ConfigDialog} Reference to this in order to allow method chaining.
     */
    ConfigDialog.prototype.destroyFooter = function () {
        this._getToolbar().destroyContent();
        return this;
    };

    /**
     * Get all Controls of the footer.
     * @override
     * @returns {sap.ui.core.Control[]} List of Controls.
     */
    ConfigDialog.prototype.getFooter = function () {
        return this._getToolbar().getContent();
    };

    /**
     * Get the index of the Control or -1 if it is not found.
     * @override
     * @param   {sap.ui.core.Control} oControl The Control whose index is looked for
     * @returns {number}              The index of the provided control in the aggregation if found, or -1 otherwise.
     */
    ConfigDialog.prototype.indexOfFooter = function (oControl) {
        return this._getToolbar().indexOfContent(oControl);
    };

    /**
     * Insert a Control into the footer.
     * @override
     * @param   {sap.ui.core.Control}             oControl The control to add
     * @param   {number}                          iIndex   The 0-based index
     * @returns {ps.app.ui.lib.ConfigDialog} Reference to this in order to allow method chaining.
     */
    ConfigDialog.prototype.insertFooter = function (oControl, iIndex) {
        this._getToolbar().insertContent(oControl, iIndex);
        return this;
    };

    /**
     * Remove all Controls from the footer.
     * @override
     * @returns {sap.ui.core.Control[]} List of removed Controls.
     */
    ConfigDialog.prototype.removeAllFooter = function () {
        return this._getToolbar().removeAllContent();
    };

    /**
     * Remove a Control from the footer.
     * @param   {sap.ui.core.Control|string|number} vControl The Control, its id, or index
     * @returns {sap.ui.core.Control}               The removed Control.
     */
    ConfigDialog.prototype.removeFooter = function (vControl) {
        return this._getToolbar().removeContent(vControl);
    };

    return ConfigDialog;
});
