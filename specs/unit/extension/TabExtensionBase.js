sap.ui.require([
    "ps/app/ui/extension/TabExtensionBase"
], function TabExtensionTest(TabExtensionBase) {
    "use strict";

    QUnit.module("TabExtensionBase");

    QUnit.test("Initial Check", function initialTest(assert) {
        // Arrange
        var oTabExtensionBase = new TabExtensionBase();

        // Assert
        assert.ok(oTabExtensionBase, "TabExtensionBase was created");
        assert.ok(oTabExtensionBase instanceof TabExtensionBase, "TabExtensionBase was created from the correct class");

        // Cleanup
        oTabExtensionBase.destroy();
    });

    QUnit.test("Function existance", function functionExistanceTest(assert) {
        // Arrange
        var oTabExtensionBase = new TabExtensionBase();

        // Assert
        assert.strictEqual(typeof oTabExtensionBase.getText, "function", "TabExtensionBase.getText is a function");
        assert.strictEqual(typeof oTabExtensionBase.getContent, "function", "TabExtensionBase.getContent is a function");

        // Cleanup
        oTabExtensionBase.destroy();
    });

    QUnit.test("Function throw", function functionThrowTest(assert) {
        // Arrange
        var oTabExtensionBase = new TabExtensionBase();

        // Assert
        assert.throws(oTabExtensionBase.getText, "TabExtensionBase.getText throws an error");
        assert.throws(oTabExtensionBase.getContent, "TabExtensionBase.getContent throws an error");

        // Cleanup
        oTabExtensionBase.destroy();
    });

    QUnit.test("extended function throw", function extendedFunctionThrowTest(assert) {
        // Arrange
        var TabExtension = TabExtensionBase.extend("TabExtension");
        var oTabExtension = new TabExtension();

        // Assert
        assert.ok(oTabExtension instanceof TabExtensionBase, "concrete TabExtension was created from the correct base class");
        assert.throws(oTabExtension.getText, "TabExtension.getText throws an error");
        assert.throws(oTabExtension.getContent, "TabExtension.getContent throws an error");

        // Cleanup
        oTabExtension.destroy();
    });
});
