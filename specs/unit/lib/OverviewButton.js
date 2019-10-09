sap.ui.require([
    "ps/app/ui/lib/OverviewButton"
], function (OverviewButton) {
    "use strict";

    QUnit.module("OverviewButton");

    QUnit.test("Initial Check", function (assert) {
        // Arrange
        var oOverviewButton = new OverviewButton();

        // Act
        var oOverviewButtonById = sap.ui.getCore().byId(oOverviewButton.getId());

        // Assert
        assert.ok(typeof oOverviewButtonById !== "undefined" && oOverviewButtonById !== null, "OverviewButton should be found");
        assert.equal(oOverviewButtonById, oOverviewButton, "correct OverviewButton should be found");

        // Cleanup
        oOverviewButton.destroy();
    });

    QUnit.test("Default Properties", function (assert) {
        // Arrange
        var oOverviewButton = new OverviewButton();

        // Assert
        assert.ok(!oOverviewButton.getColor(), "color is set to undefined");
        assert.strictEqual(oOverviewButton.getText(), "", "text is empty");

        // Cleanup
        oOverviewButton.destroy();
    });

    QUnit.test("setColor()", function (assert) {
        // Arrange
        var oOverviewButton = new OverviewButton();

        // Act
        oOverviewButton.setColor(ps.app.ui.lib.LaneColor.MediumGold);
        oOverviewButton.setColor(ps.app.ui.lib.LaneColor.DarkGold);

        // Assert
        assert.equal(oOverviewButton.getColor(), "DarkGold", "color is set correctly");
        assert.ok(!oOverviewButton.hasStyleClass("sapTlOverviewButtonMediumGold"), "old style class was removed");
        assert.ok(oOverviewButton.hasStyleClass("sapTlOverviewButtonDarkGold"), "new style class was set");

        // Cleanup
        oOverviewButton.destroy();
    });

    QUnit.test("setPressed()", function (assert) {
        // Arrange
        var oOverviewButton = new OverviewButton();

        // Act
        oOverviewButton.setPressed(true);

        // Assert
        assert.ok(oOverviewButton.getPressed(), "pressed is set to true");

        // Act
        oOverviewButton.setPressed(false);

        // Assert
        assert.ok(!oOverviewButton.getPressed(), "pressed is set to false");

        // Cleanup
        oOverviewButton.destroy();
    });

    QUnit.test("rendering", function (assert) {
        // Arrange
        var oOverviewButton = new OverviewButton();

        // Act
        oOverviewButton.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();

        // Assert
        assert.ok(oOverviewButton.$().hasClass("sapTlOverviewButton"), "OverviewButton has base class");
        assert.equal(oOverviewButton.getType(), sap.m.ButtonType.Unstyled, "OverviewButton is type unstyled");

        // Cleanup
        oOverviewButton.destroy();
    });

    QUnit.test("rendering - pressed class", function (assert) {
        // Arrange
        var oOverviewButton = new OverviewButton();

        // Act
        oOverviewButton.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();

        // Assert
        assert.ok(!oOverviewButton.$("inner").hasClass("sapMToggleBtnPressed"), "button inner doesn't have pressed class");

        // Act
        oOverviewButton.setPressed(true);
        sap.ui.getCore().applyChanges();

        // Assert
        assert.ok(oOverviewButton.$("inner").hasClass("sapMToggleBtnPressed"), "button inner has pressed class");

        // Cleanup
        oOverviewButton.destroy();
    });
});
