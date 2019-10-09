sap.ui.require([
    "ps/app/ui/lib/Timeline"
], function (Timeline) {
    "use strict";

    QUnit.module("Timeline");

    QUnit.test("Initial Check", function (assert) {
        // Arrange
        var oTimeline = new Timeline();

        // Act
        var oTimelineById = sap.ui.getCore().byId(oTimeline.getId());

        // Assert
        assert.ok(typeof oTimelineById !== "undefined" && oTimelineById !== null, "Timeline should be found");
        assert.equal(oTimelineById, oTimeline, "correct Timeline should be found");

        // Cleanup
        oTimeline.destroy();
    });

    QUnit.test("Default Properties", function (assert) {
        // Arrange
        var oTimeline = new Timeline();

        // Assert
        assert.strictEqual(typeof oTimeline.getDateOfBirth(), "undefined", "date of birth is undefined");
        assert.strictEqual(typeof oTimeline.getDateOfDeath(), "undefined", "date of death is undefined");
        assert.strictEqual(typeof oTimeline.getDateRangeMax(), "undefined", "dateRangeMax is undefined");
        assert.strictEqual(typeof oTimeline.getDateRangeMin(), "undefined", "dateRangeMin is undefined");

        // Cleanup
        oTimeline.destroy();
    });

    QUnit.test("getScale()", function (assert) {
        // Arrange
        var oTimeline = new Timeline();

        // Assert
        assert.equal(typeof oTimeline.getScale(), "function", "returns a function");
        assert.equal(oTimeline.getScale().domain()[0].getTime(), 0, "scale domain min is 0");
        assert.equal(oTimeline.getScale().domain()[1].getTime(), 1, "scale domain max is 1");

        // Cleanup
        oTimeline.destroy();
    });

    QUnit.test("getTexts()", function getTextsTest(assert) {
        // Arrange
        var oTimeline = new Timeline();

        // Assert
        assert.deepEqual(oTimeline.getTexts(), {
            todayTooltip: "",
            dobTooltip: "",
            dodTooltip: ""
        }, "Text keys are found");

        // Cleanup
        oTimeline.destroy();
    });

    QUnit.test("resetZoom()", function (assert) {
        // Arrange
        var oTimeline = new Timeline({
            dateRangeMax: new Date(86400000),
            dateRangeMin: new Date(0)
        });

        // Act
        oTimeline.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();
        oTimeline.resetZoom();

        // Assert
        assert.equal(oTimeline.getScale().domain()[0].getTime(), -8640000, "scale domain min is range min minus padding");
        assert.equal(oTimeline.getScale().domain()[1].getTime(), 95040000, "scale domain max is range max plus padding");

        // Cleanup
        oTimeline.destroy();
    });

    QUnit.test("basic rendering", function (assert) {
        // Arrange
        var oTimeline = new Timeline();

        // Act
        oTimeline.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();

        // Assert
        assert.ok(oTimeline.$().hasClass("sapTlTimeline"), "Timeline has base class");

        // Cleanup
        oTimeline.destroy();
    });

    QUnit.test("render DOB and DOD lines", function (assert) {
        // Arrange
        var oTimeline = new Timeline({
            dateOfBirth: new Date(1),
            dateOfDeath: new Date()
        });

        // Act
        oTimeline.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();

        // Assert
        assert.ok(oTimeline.$().find(".sapTlTimelineDOB").length, "Timeline has a DOB line");
        assert.ok(oTimeline.$().find(".sapTlTimelineDOD").length, "Timeline has a DOD line");

        // Cleanup
        oTimeline.destroy();
    });
});
