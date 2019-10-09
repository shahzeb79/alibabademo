sap.ui.require([
    "ps/app/ui/lib/Lane",
    "ps/app/ui/lib/Tile",
    "ps/app/ui/lib/Timeline",
    "ps/app/ui/utils/Utils"
], function TileTest(Lane, Tile, Timeline, Utils) {
    "use strict";

    QUnit.module("Tile");

    QUnit.test("Initial Check", function initialTest(assert) {
        // Arrange
        var oTile = new Tile();

        // Act
        var oTileById = sap.ui.getCore().byId(oTile.getId());

        // Assert
        assert.ok(typeof oTileById !== "undefined" && oTileById !== null, "Tile should be found");
        assert.equal(oTileById, oTile, "correct Tile should be found");

        // Cleanup
        oTile.destroy();
    });

    QUnit.test("Default Properties", function propertiesTest(assert) {
        // Arrange
        var oTile = new Tile();

        // Assert
        assert.strictEqual(typeof oTile.getEnd(), "undefined", "end is not set");
        assert.strictEqual(oTile.getName(), "", "name is set to an empty string");
        assert.strictEqual(typeof oTile.getStart(), "undefined", "start is not set");
        assert.strictEqual(typeof oTile.getVariantBrowserSampleId(), "undefined", "variantBrowserSampleId is set to undefined");

        // Cleanup
        oTile.destroy();
    });

    QUnit.skip("getFocusDomRef()");

    QUnit.test("addHiddenTile()", function addHiddenTileTest(assert) {
        // Arrange
        var oTile1 = new Tile({
            start: new Date(0),
            end: new Date(0)
        });
        var oTile2 = new Tile({
            start: new Date(0),
            end: new Date(0)
        });
        var oTile3 = new Tile({
            start: new Date(0),
            end: new Date(1)
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2,
                        oTile3
                    ]
                })
            ]
        });

        // Act
        oTile1.addHiddenTile(oTile2);

        // Assert
        assert.strictEqual(oTile1.getHiddenTiles().length, 1, "tile has one hidden Tile");
        assert.ok(!oTile1.isStacked(), "tile is not stacked");

        // Act
        oTile1.addHiddenTile(oTile3);

        // Assert
        assert.strictEqual(oTile1.getHiddenTiles().length, 2, "tile has one hidden Tile");
        assert.ok(oTile1.isStacked(), "tile is stacked");

        // Cleanup
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
        oTimeline.destroy();
    });

    QUnit.test("getMainAttributes()", function getMainAttributesTest(assert) {
        // Arrange
        var oTileAttribute1 = {
            main: true,
            mainOrder: 1
        };
        var oTileAttribute2 = {
            main: true,
            mainOrder: 2
        };
        var oTileAttribute3 = {};
        var oTile = new Tile({
            attributes: [
                oTileAttribute1,
                oTileAttribute2,
                oTileAttribute3
            ]
        });

        // Assert
        assert.strictEqual(oTile.getMainAttributes().length, 2, "tile has two main attributes");
        assert.strictEqual(oTile.getMainAttributes()[0], oTileAttribute1, "tile has the right first main attribute");
        assert.strictEqual(oTile.getMainAttributes()[1], oTileAttribute2, "tile has the right second main attribute");

        // Cleanup
        oTile.destroy();
    });

    QUnit.test("getBadgeCount()", function getBadgeCountTest(assert) {
        // Arrange
        var oTile1 = new Tile();
        var oTile2 = new Tile();

        // Assert
        assert.strictEqual(oTile1.getBadgeCount(), 1, "tile has badge count of 1");

        // Act
        oTile1.addHiddenTile(oTile2);

        // Assert
        assert.strictEqual(oTile1.getBadgeCount(), 2, "tile has badge count of 2");

        // Cleanup
        oTile1.destroy();
        oTile2.destroy();
    });

    QUnit.test("getDisplayName()", function getDisplayNameTest(assert) {
        // Arrange
        var sTileTitle = "Tile Title";
        var sLaneTitle = "Lane Title";
        var oTile1 = new Tile({
            name: sTileTitle
        });
        var oTile2 = new Tile();
        var oLane = new Lane({
            title: sLaneTitle,
            tiles: [
                oTile1,
                oTile2
            ]
        });

        // Assert
        assert.strictEqual(oTile1.getDisplayName(), sTileTitle, "tile has indevidual title");

        // Act
        oTile1.addHiddenTile(oTile2);

        // Assert
        assert.strictEqual(oTile1.getDisplayName(), sLaneTitle, "tile has group title");

        // Cleanup
        oTile1.destroy();
        oTile2.destroy();
        oLane.destroy();
    });

    QUnit.test("getDurationWidth()", function getDurationWidthTest(assert) {
        // Arrange
        var oTile1 = new Tile();
        var oTile2 = new Tile({
            end: new Date(1)
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2
                    ]
                })
            ]
        });

        // Assert
        assert.strictEqual(oTile1.getDurationWidth(), 10, "point tile has a duration width of 10");
        assert.strictEqual(oTile2.getDurationWidth(), 10, "short tile has a duration width of 10");

        // Cleanup
        oTimeline.destroy();
    });

    QUnit.test("getTimeIndicators() - default value", function (assert) {
        // Arrange
        //           0  100 200 300 400 500     1000      pixels
        //           10 11  12  13  14  15      20        January 2017
        // timeline: |----------------------//--|
        //     tile:        |---|
        // expected:        |1--|
        var timelineScale = d3.time.scale()
            .domain([new Date("2017-01-10"), new Date("2017-01-20")])
            .range([0, 1000]);
        var oTile = new Tile({
            start: new Date("2017-01-12"),
            end: new Date("2017-01-13")
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile
                    ]
                })
            ]
        });

        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oTimeline.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();

        // Assert
        var aExpectedIndicators = [{
            left: 200,
            width: 100,
            numRepresentedInteractions: 1
        }];
        var aActualTimeIndicators = oTile.getTimeIndicators();
        assert.equal(aActualTimeIndicators.length, aExpectedIndicators.length, "one time indicator is returned");
        assert.equal(Math.round(aActualTimeIndicators[0].width), aExpectedIndicators[0].width, "width of time indicator");
        assert.equal(aActualTimeIndicators[0].numRepresentedInteractions, aExpectedIndicators[0].numRepresentedInteractions, "one interactions is represented");

        // Cleanup
        timelineScaleStub.restore();
        oTimeline.destroy();
        oTile.destroy();
    });

    QUnit.test("getGroupName()", function getGroupNameTest(assert) {
        // Arrange
        var sLaneTitle = "Lane Title";
        var oTile = new Tile();
        var oLane = new Lane({
            title: sLaneTitle,
            tiles: [
                oTile
            ]
        });

        // Assert
        assert.strictEqual(oTile.getGroupName(), sLaneTitle, "tile has group title");

        // Cleanup
        oTile.destroy();
        oLane.destroy();
    });

    QUnit.test("getLane()", function getLaneTest(assert) {
        // Arrange
        var oTile1 = new Tile();
        var oTile2 = new Tile();
        var oLane = new Lane({
            tiles: [
                oTile2
            ]
        });

        // Assert
        assert.strictEqual(typeof oTile1.getLane(), "undefined", "getLane returns undefined");
        assert.strictEqual(oTile2.getLane(), oLane, "getLane returns the parent Lane");

        // Cleanup
        oTile1.destroy();
        oTile2.destroy();
        oLane.destroy();
    });

    QUnit.skip("getLeft()");

    QUnit.test("getRepresentedTiles()", function getRepresentedTilesTest(assert) {
        // Arrange
        var oTile2 = new Tile();
        var oTile1 = new Tile({
            hiddenTiles: [
                oTile2
            ]
        });

        // Assert
        assert.strictEqual(oTile1.getRepresentedTiles().length, 2, "tile has two represented Tiles");
        assert.strictEqual(oTile1.getRepresentedTiles()[0], oTile1, "tile has itself as first represented Tile");
        assert.strictEqual(oTile1.getRepresentedTiles()[1], oTile2, "tile has its hidden Tile as second represented Tile");

        // Cleanup
        oTile1.destroy();
        oTile2.destroy();
    });

    QUnit.skip("getRight()");

    QUnit.test("getSimpleDetails()", function getSimpleDetailsTest(assert) {
        // Arrange
        var sTitle1 = "One";
        var sTitle2 = "Two";
        var oTile2 = new Tile({
            name: sTitle2
        });
        var oTile1 = new Tile({
            name: sTitle1,
            hiddenTiles: [
                oTile2
            ]
        });

        // Assert
        assert.strictEqual(oTile1.getSimpleDetails(), sTitle1 + ", " + sTitle2, "tile has represented Tiles' names as simple details");

        // Cleanup
        oTile1.destroy();
        oTile2.destroy();
    });

    QUnit.test("getTileTime()", function getTileTimeTest(assert) {
        // Arrange
        var oDate1 = new Date(0);
        var oDate2 = new Date("1970-01-01");
        var oDate3 = new Date("1970-01-10");
        var oTile1 = new Tile({
            start: oDate1,
            end: oDate1
        }).setModel(sap.ui.getCore().getModel("i18n"), "i18n");
        var oTile2 = new Tile({
            start: oDate2,
            end: oDate3
        }).setModel(sap.ui.getCore().getModel("i18n"), "i18n");
        var sStart = Utils.formatDate(oDate2);
        var sEnd = Utils.formatDate(oDate3);

        // Assert
        assert.strictEqual(oTile1.getTileTime(), sStart, "point Tile has one date (using the formatter form Utils)");
        assert.strictEqual(oTile2.getTileTime(), sStart + " - " + sEnd, "duration Tile has a date range  (using the formatter form Utils)");

        // Cleanup
        oTile1.destroy();
        oTile2.destroy();
    });

    QUnit.test("getTileWidth()", function getTileWidthTest(assert) {
        // Arrange
        var oTile1 = new Tile();
        var oTile2 = new Tile({
            end: new Date(1)
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2
                    ]
                })
            ]
        });

        // Assert
        assert.strictEqual(oTile1.getTileWidth(), Tile.MIN_WIDTH, "point Tile has a width of " + Tile.MIN_WIDTH);
        assert.strictEqual(oTile2.getTileWidth(), Tile.MIN_WIDTH, "small duration Tile has a width of " + Tile.MIN_WIDTH);

        // Cleanup
        oTimeline.destroy();
    });

    QUnit.test("getTime()", function getTimeTest(assert) {
        // Arrange
        var oDate1 = new Date(0);
        var oDate2 = new Date("1970-01-10");
        var oDate3 = new Date("1970-01-20");
        var oTile1 = new Tile({
            start: oDate1,
            end: oDate1
        }).setModel(sap.ui.getCore().getModel("i18n"), "i18n");
        var oTile2 = new Tile({
            start: oDate2,
            end: oDate3
        }).setModel(sap.ui.getCore().getModel("i18n"), "i18n");
        var oTile3 = new Tile({
            start: oDate1,
            end: oDate2
        }).setModel(sap.ui.getCore().getModel("i18n"), "i18n");
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2,
                        oTile3
                    ]
                })
            ]
        });
        var sDate1 = Utils.formatDate(oDate1);
        var sDate2 = Utils.formatDate(oDate2);
        var sDate3 = Utils.formatDate(oDate3);

        // Act
        oTile3.addHiddenTile(oTile2);

        // Assert
        assert.strictEqual(oTile1.getTime(), sDate1, "point Tile has one date (using the formatter form Utils)");
        assert.strictEqual(oTile2.getTime(), sDate2 + " - " + sDate3, "duration Tile has a date range  (using the formatter form Utils)");
        assert.strictEqual(oTile3.getTime(), sDate1 + " - " + sDate3, "stacked Tile has a date range (using the formatter form Utils)");

        // Cleanup
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
        oTimeline.destroy();
    });

    QUnit.test("getWidth()", function getWidthTest(assert) {
        // Arrange
        var oTile1 = new Tile();
        var oTile2 = new Tile({
            end: new Date(1)
        });
        var oTile3 = new Tile();
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2,
                        oTile3
                    ]
                })
            ]
        });

        // Act
        oTile3.addHiddenTile(oTile2);

        // Assert
        assert.strictEqual(oTile1.getWidth(), Tile.MIN_WIDTH, "point Tile has a width of " + Tile.MIN_WIDTH);
        assert.strictEqual(oTile3.getWidth(), Tile.MIN_WIDTH, "small stacked Tile has a width of " + Tile.MIN_WIDTH);

        // Cleanup
        oTimeline.destroy();
    });

    QUnit.test("getWidth() - short duration tile", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;

        // Arrange
        //           0  100 200 300 400 500     1000      pixels
        //           10 11  12  13  14  15      20        January 2017
        // timeline: |----------------------//--|
        //     tile:        |---|
        // expected:        [1      ]
        var timelineScale = d3.time.scale()
            .domain([new Date("2017-01-10"), new Date("2017-01-20")])
            .range([0, 1000]);
        var oTile = new Tile({
            start: new Date("2017-01-12"),
            end: new Date("2017-01-13")
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile
                    ]
                })
            ]
        });
        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Assert
        assert.equal(Math.round(oTile.getWidth()), Tile.MIN_WIDTH, "tile has width of 200 (==Tile.MIN_WIDTH)");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        oTimeline.destroy();
        oTile.destroy();
    });

    QUnit.test("getWidth() - long duration tile", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;

        // Arrange
        //           0  100 200 300 400 500     1000      pixels
        //           10 11  12  13  14  15      20        January 2017
        // timeline: |----------------------//--|
        //     tile:        |-----------|
        // expected:        [1          ]
        var timelineScale = d3.time.scale()
            .domain([new Date("2017-01-10"), new Date("2017-01-20")])
            .range([0, 1000]);
        var oTile = new Tile({
            start: new Date("2017-01-12"),
            end: new Date("2017-01-15")
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile
                    ]
                })
            ]
        });
        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Assert
        assert.equal(Math.round(oTile.getWidth()), 300, "tile has width of 300");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        oTimeline.destroy();
        oTile.destroy();
    });

    QUnit.test("getWidth() - short stacked tile with overlapping point and duration interactions", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;

        // Arrange
        //           0   50  100 150 200 250    1000      pixels
        //           10  11  12  13  14  16     30        January 2017
        // timeline: |-----------------------//-|
        //    tile1:     |
        //    tile2:         |-------|
        //    tile3:             |
        // expected:     [3              ]
        var timelineScale = d3.time.scale()
            .domain([new Date("2017-01-10"), new Date("2017-01-30")])
            .range([0, 1000]);
        var oTile1 = new Tile({
            start: new Date("2017-01-11"),
            end: new Date("2017-01-11")
        });
        var oTile2 = new Tile({
            start: new Date("2017-01-12"),
            end: new Date("2017-01-14")
        });
        var oTile3 = new Tile({
            start: new Date("2017-01-13"),
            end: new Date("2017-01-13")
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2,
                        oTile3
                    ]
                })
            ]
        });
        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oTile1.addHiddenTile(oTile2);
        oTile1.addHiddenTile(oTile3);

        // Assert
        assert.equal(Math.round(oTile1.getWidth()), Tile.MIN_WIDTH, "tile has width of 200 (==Tile.MIN_WIDTH)");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        oTimeline.destroy();
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
    });

    QUnit.test("getWidth() - long stacked tile with overlapping point and duration interactions", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;

        // Arrange
        //           0  100 200 300 400 500     1000      pixels
        //           10 11  12  13  14  15      20        January 2017
        // timeline: |----------------------//--|
        //    tile1:    |
        //    tile2:        |-----------|
        //    tile3:            |
        //    tile4:                |
        // combined:    [4              ]
        var timelineScale = d3.time.scale()
            .domain([new Date("2017-01-10"), new Date("2017-01-20")])
            .range([0, 1000]);
        var oTile1 = new Tile({
            start: new Date("2017-01-11"),
            end: new Date("2017-01-11")
        });
        var oTile2 = new Tile({
            start: new Date("2017-01-12"),
            end: new Date("2017-01-15")
        });
        var oTile3 = new Tile({
            start: new Date("2017-01-13"),
            end: new Date("2017-01-13")
        });
        var oTile4 = new Tile({
            start: new Date("2017-01-14"),
            end: new Date("2017-01-14")
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2,
                        oTile3,
                        oTile4
                    ]
                })
            ]
        });
        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oTile1.addHiddenTile(oTile2);
        oTile1.addHiddenTile(oTile3);
        oTile1.addHiddenTile(oTile4);

        // Assert
        assert.equal(Math.round(oTile1.getWidth()), 400, "tile has width of 400");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        oTimeline.destroy();
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
        oTile4.destroy();
    });

    QUnit.test("getWidth() - stacked point interactions", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;

        // Arrange
        //           0  100 200 300 400 500     1000      pixels
        //           10 11  12  13  14  15      20        January 2017
        // timeline: |----------------------//--|
        //    tile1:    |
        //    tile2:        |
        //    tile3:            |
        //    tile4:                |
        // combined:    [4           ]
        var timelineScale = d3.time.scale()
            .domain([new Date("2017-01-10"), new Date("2017-01-20")])
            .range([0, 1000]);
        var oTile1 = new Tile({
            start: new Date("2017-01-11"),
            end: new Date("2017-01-11")
        });
        var oTile2 = new Tile({
            start: new Date("2017-01-12"),
            end: new Date("2017-01-12")
        });
        var oTile3 = new Tile({
            start: new Date("2017-01-13"),
            end: new Date("2017-01-13")
        });
        var oTile4 = new Tile({
            start: new Date("2017-01-14"),
            end: new Date("2017-01-14")
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2,
                        oTile3,
                        oTile4
                    ]
                })
            ]
        });
        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oTile1.addHiddenTile(oTile2);
        oTile1.addHiddenTile(oTile3);
        oTile1.addHiddenTile(oTile4);

        // Assert
        assert.equal(Math.round(oTile1.getWidth()), 310, "tile has width of 310 (distance from first to last tile + 10 pixels for time indicator");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        oTimeline.destroy();
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
        oTile4.destroy();
    });

    QUnit.test("isMultiple()", function (assert) {
        // Arrange
        var oTile1 = new Tile();
        var oTile2 = new Tile();
        var oTile3 = new Tile();
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2,
                        oTile3
                    ]
                })
            ]
        });

        // Act
        oTile3.addHiddenTile(oTile2);

        // Assert
        assert.ok(!oTile1.isMultiple(), "Tile is single");
        assert.ok(oTile3.isMultiple(), "Tile is multiple");

        // Cleanup
        oTimeline.destroy();
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
    });

    QUnit.test("isPoint()", function isPointTest(assert) {
        // Arrange
        var oTile1 = new Tile({
            start: new Date(0),
            end: new Date(0)
        });
        var oTile2 = new Tile({
            start: new Date(0),
            end: new Date(1)
        });

        // Assert
        assert.ok(oTile1.isPoint(), "Tile is point");
        assert.ok(!oTile2.isPoint(), "Tile is not point");

        // Cleanup
        oTile1.destroy();
        oTile2.destroy();
    });

    QUnit.test("isStacked()", function (assert) {
        // Arrange
        var oTile1 = new Tile({
            start: new Date(0),
            end: new Date(0)
        });
        var oTile2 = new Tile({
            start: new Date(0),
            end: new Date(1)
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2
                    ]
                })
            ]
        });

        // Act
        oTile2.addHiddenTile(oTile1);

        // Assert
        assert.ok(!oTile1.isStacked(), "Tile is not stacked");
        assert.ok(oTile2.isStacked(), "Tile is stacked");

        // Cleanup
        oTimeline.destroy();
        oTile1.destroy();
        oTile2.destroy();
    });

    QUnit.test("removeAllHiddenTiles()", function removeAllHiddenTilesTest(assert) {
        // Arrange
        var oTile1 = new Tile({
            start: new Date(0),
            end: new Date(0)
        });
        var oTile2 = new Tile({
            start: new Date(0),
            end: new Date(1)
        });
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile1,
                        oTile2
                    ]
                })
            ]
        });

        // Act
        oTile2.addHiddenTile(oTile1);

        // Assert
        assert.ok(oTile2.isStacked(), "Tile is stacked");
        assert.strictEqual(oTile2.getHiddenTiles().length, 1, "Tile has one hidden Tile");

        // Act
        oTile2.removeAllHiddenTiles();

        // Assert
        assert.ok(!oTile2.isStacked(), "Tile is not stacked");
        assert.strictEqual(oTile2.getHiddenTiles().length, 0, "Tile has no hidden Tile");

        // Cleanup
        oTimeline.destroy();
        oTile1.destroy();
        oTile2.destroy();
    });

    QUnit.test("basic rendering", function renderingTest(assert) {
        // Arrange
        var oTile = new Tile();
        var oTimeline = new Timeline({
            lanes: [
                new Lane({
                    tiles: [
                        oTile
                    ]
                })
            ]
        });

        // Act
        oTimeline.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();

        // Assert
        assert.ok(oTile.$().hasClass("sapTlTileUmbrella"), "Tile has umbrella base class");

        // Assert
        assert.ok(oTile.$("tile").hasClass("sapTlTile"), "Tile has base class");

        // Cleanup
        oTile.destroy();
        oTimeline.destroy();
    });
});
