sap.ui.require([
    "ps/app/ui/lib/Tile",
    "ps/app/ui/lib/TilePopoverContent"
], function (Tile, TilePopoverContent) {
    "use strict";

    QUnit.module("TilePopoverContent");

    QUnit.test("Initial Check", function (assert) {
        // Arrange
        var oTilePopoverContent = new TilePopoverContent();

        // Act
        var oTilePopoverContentById = sap.ui.getCore().byId(oTilePopoverContent.getId());

        // Assert
        assert.ok(typeof oTilePopoverContentById !== "undefined" && oTilePopoverContentById !== null, "TilePopoverContent should be found");
        assert.equal(oTilePopoverContentById, oTilePopoverContent, "correct TilePopoverContent should be found");

        // Cleanup
        oTilePopoverContent.destroy();
    });

    QUnit.test("Default Properties", function (assert) {
        // Arrange
        var oTilePopoverContent = new TilePopoverContent();

        // Assert
        assert.strictEqual(typeof oTilePopoverContent.getColor(), "undefined", "color is set to undefined");
        assert.strictEqual(oTilePopoverContent.getCount(), 1, "count is set to 1");
        assert.strictEqual(oTilePopoverContent.getTitle(), "", "text is set to an empty string");
        assert.strictEqual(oTilePopoverContent.getTime(), "", "time is set to an empty string");

        // Cleanup
        oTilePopoverContent.destroy();
    });

    QUnit.test("getTileInstances()", function (assert) {
        // Arrange
        var oTilePopoverContent1 = new TilePopoverContent();
        var oTile = new Tile();
        var oTilePopoverContent2 = new TilePopoverContent({
            tiles: [
                oTile
            ]
        });

        // Assert
        assert.ok(!oTilePopoverContent1.getTileInstances().length, "returns an empty list");
        assert.equal(oTilePopoverContent2.getTileInstances()[0], oTile, "returns a list including the Tile");

        // Cleanup
        oTilePopoverContent1.destroy();
        oTile.destroy();
        oTilePopoverContent2.destroy();
    });

    // The function depends on the i18n model to be set, which I am not sure how to simulate
    QUnit.skip("getVbLabel()", function (assert) {
        // Arrange
        var oTilePopoverContent = new TilePopoverContent();

        // Assert
        assert.equal(oTilePopoverContent.getVbLabel(), "Genomic View", "returns the translated string");

        // Cleanup
        oTilePopoverContent.destroy();
    });

    QUnit.test("rendering", function (assert) {
        // Arrange
        var oTilePopoverContent = new TilePopoverContent();

        // Act
        oTilePopoverContent.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();

        // Assert
        assert.ok(oTilePopoverContent.$().hasClass("sapTlPopover"), "TilePopoverContent has base class");

        // Cleanup
        oTilePopoverContent.destroy();
    });
});
