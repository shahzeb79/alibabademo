sap.ui.define([
    "jquery.sap.global",
    "sap/ui/model/Model",
    "sap/ui/model/resource/ResourcePropertyBinding"
], function (jQuery, Model, ResourcePropertyBinding) {
    "use strict";

    /**
     * Constructor for a new FakeI18nModel.
     * @constructor
     * @param {object} [mTexts] Objects of texts to be mocked.
     *
     * @classdesc
     * A ResourceModel that can be used for mocking translations in tests.
     * @extends sap.ui.model.Model
     * @alias ps.specs.FakeI18nModel
     */
    var FakeI18nModel = Model.extend("ps.specs.FakeI18nModel", {
        constructor: function (mTexts) {
            this.mTexts = mTexts || {};
            this.aBindings = [];
        }
    });

    /**
     * Bind the property with the given <code>sPropertyName</code>.
     * @param   {string}                                        sPath The path to the property
     * @returns {sap.ui.model.resource.ResourcePropertyBinding} The binding object
     */
    FakeI18nModel.prototype.bindProperty = function (sPath) {
        return new ResourcePropertyBinding(this, sPath);
    };

    /**
     * Returns the value for the property with the given <code>sPropertyName</code>.
     * @param   {string} sPath the path to the property
     * @returns {string} the value of the property
     */
    FakeI18nModel.prototype.getProperty = function (sPath) {
        return this.mTexts[sPath];
    };

    /**
     * Returns an object that acts as resource bundle for this model
     * @returns {object} fake resource bundle
     */
    FakeI18nModel.prototype.getResourceBundle = function () {
        return {
            getText: function (sTextName) {
                return this.mTexts[sTextName];
            }.bind(this)
        };
    };

    return FakeI18nModel;
});
