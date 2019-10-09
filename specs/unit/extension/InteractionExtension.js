sap.ui.require([
    "ps/app/ui/extension/InteractionExtensionBase"
], function InteractionExtensionTest(InteractionExtensionBase) {
    "use strict";

    QUnit.module("InteractionExtensionBase");

    QUnit.test("Initial Check", function initialTest(assert) {
        // Arrange
        var oInteractionExtensionBase = new InteractionExtensionBase();

        // Assert
        assert.ok(oInteractionExtensionBase, "InteractionExtensionBase was created");
        assert.ok(oInteractionExtensionBase instanceof InteractionExtensionBase, "InteractionExtensionBase was created from the correct class");

        // Cleanup
        oInteractionExtensionBase.destroy();
    });

    QUnit.test("Function existance", function functionExistanceTest(assert) {
        // Arrange
        var oInteractionExtensionBase = new InteractionExtensionBase();

        // Assert
        assert.strictEqual(typeof oInteractionExtensionBase.getOverviewControls, "function", "InteractionExtensionBase.getOverviewControls is a function");
        assert.strictEqual(typeof oInteractionExtensionBase.getTimelineControls, "function", "InteractionExtensionBase.getTimelineControls is a function");

        // Cleanup
        oInteractionExtensionBase.destroy();
    });

    QUnit.test("Function throw", function functionThrowTest(assert) {
        // Arrange
        var oInteractionExtensionBase = new InteractionExtensionBase();

        // Assert
        assert.throws(oInteractionExtensionBase.getOverviewControls, "InteractionExtensionBase.getOverviewControls throws an error");
        assert.throws(oInteractionExtensionBase.getTimelineControls, "InteractionExtensionBase.getTimelineControls throws an error");

        // Cleanup
        oInteractionExtensionBase.destroy();
    });

    QUnit.test("extended function throw", function extendedFunctionThrowTest(assert) {
        // Arrange
        var InteractionExtension = InteractionExtensionBase.extend("InteractionExtension");
        var oInteractionExtension = new InteractionExtension();

        // Assert
        assert.throws(oInteractionExtension.getOverviewControls, "InteractionExtension.getOverviewControls throws an error");
        assert.throws(oInteractionExtension.getTimelineControls, "InteractionExtension.getTimelineControls throws an error");

        // Cleanup
        oInteractionExtension.destroy();
    });
});
