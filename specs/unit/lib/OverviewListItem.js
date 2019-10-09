sap.ui.require([
    "ps/app/ui/lib/OverviewListItem",
    "sap/ui/core/format/DateFormat"
], function (OverviewListItem, DateFormat) {
    "use strict";

    var oDateFormatter = DateFormat.getDateInstance();

    QUnit.module("OverviewListItem");

    QUnit.test("Initial Check", function (assert) {
        // Arrange
        var oOverviewListItem = new OverviewListItem();

        // Act
        var oOverviewListItemById = sap.ui.getCore().byId(oOverviewListItem.getId());

        // Assert
        assert.ok(typeof oOverviewListItemById !== "undefined" && oOverviewListItemById !== null, "OverviewListItem should be found");
        assert.equal(oOverviewListItemById, oOverviewListItem, "correct OverviewListItem should be found");

        // Cleanup
        oOverviewListItem.destroy();
    });

    QUnit.test("Default Properties", function (assert) {
        // Arrange
        var oOverviewListItem = new OverviewListItem();

        // Assert
        assert.ok(!oOverviewListItem.getColor(), "color is set to undefined");
        assert.equal(typeof oOverviewListItem.getEnd(), "undefined", "end is not set");
        assert.ok(!oOverviewListItem.getGroupName(), "groupName is set to undefined");
        assert.ok(!oOverviewListItem.getName(), "name is set to undefined");
        assert.equal(typeof oOverviewListItem.getStart(), "undefined", "start is not set");
        assert.ok(!oOverviewListItem.getVariantBrowserSampleId(), "variantBrowserSampleId is set to undefined");

        // Cleanup
        oOverviewListItem.destroy();
    });

    QUnit.skip("getTime()", function (assert) {
        // Arrange
        var oOverviewListItem1 = new OverviewListItem().setModel(sap.ui.getCore().getModel("i18n"), "i18n");
        var oOverviewListItem2 = new OverviewListItem({
            start: new Date(2010, 5, 12),
            end: new Date(2010, 5, 12)
        }).setModel(sap.ui.getCore().getModel("i18n"), "i18n");
        var oOverviewListItem3 = new OverviewListItem({
            start: new Date(2010, 5, 12),
            end: new Date(2010, 6, 1)
        }).setModel(sap.ui.getCore().getModel("i18n"), "i18n");
        var sDate1 = oDateFormatter.format(new Date("1970-01-01"));
        var sDate2 = oDateFormatter.format(new Date("2010-06-12"));
        var sDate3 = oDateFormatter.format(new Date("2010-07-01"));

        // Assert
        assert.equal(oOverviewListItem1.getTime(), sDate1, "time for default point is formatted correctly");
        assert.equal(oOverviewListItem2.getTime(), sDate2, "time for point is formatted correctly");
        assert.equal(oOverviewListItem3.getTime(), sDate2 + " - " + sDate3, "time for duration is formatted correctly");

        // Cleanup
        oOverviewListItem1.destroy();
        oOverviewListItem2.destroy();
        oOverviewListItem3.destroy();
    });

    QUnit.test("isPoint()", function (assert) {
        // Arrange
        var oOverviewListItem1 = new OverviewListItem();
        var oOverviewListItem2 = new OverviewListItem({
            start: new Date(2010, 5, 12),
            end: new Date(2010, 5, 12)
        });
        var oOverviewListItem3 = new OverviewListItem({
            start: new Date(2010, 5, 12),
            end: new Date(2010, 6, 1)
        });

        // Assert
        assert.ok(oOverviewListItem1.isPoint(), "is a point");
        assert.ok(oOverviewListItem2.isPoint(), "is a point");
        assert.ok(!oOverviewListItem3.isPoint(), "is not a point");

        // Cleanup
        oOverviewListItem1.destroy();
        oOverviewListItem2.destroy();
        oOverviewListItem3.destroy();
    });

    QUnit.test("basic rendering", function (assert) {
        // Arrange
        var oOverviewListItem = new OverviewListItem({
            start: new Date(2010, 5, 12),
            end: new Date(2010, 5, 12)
        }).setModel(sap.ui.getCore().getModel("i18n"), "i18n");

        // Act
        oOverviewListItem.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();

        // Assert
        assert.ok(oOverviewListItem.$().hasClass("sapTlOverviewListItem"), "Point-in-time OverviewListItem has base class");
        assert.ok(oOverviewListItem.$().find(".sapTlOverviewListItemTimeVisual").hasClass("sapTlOverviewListItemTimeVisualPoint"), "Point-in-time OverviewListItem time visualization has point class");

        // Cleanup
        oOverviewListItem.destroy();
    });
});
