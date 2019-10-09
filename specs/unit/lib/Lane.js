sap.ui.require([
    "ps/app/ui/lib/Lane",
    "ps/app/ui/lib/Tile",
    "ps/app/ui/lib/Timeline",
    "sap/ui/thirdparty/d3"
], function (Lane, Tile, Timeline) {
    "use strict";

    QUnit.module("Lane");

    QUnit.test("Initial Check", function (assert) {
        // Arrange
        var oLane = new Lane();

        // Act
        var oLaneById = sap.ui.getCore().byId(oLane.getId());

        // Assert
        assert.ok(typeof oLaneById !== "undefined" && oLaneById !== null, "Lane should be found");
        assert.equal(oLaneById, oLane, "correct Lane should be found");

        // Cleanup
        oLane.destroy();
    });

    QUnit.test("Default Properties", function (assert) {
        // Arrange
        var oLane = new Lane();

        // Assert
        assert.strictEqual(oLane.getTitle(), "", "title is set to an empty string");
        assert.strictEqual(typeof oLane.getColor(), "undefined", "color is set to undefined");

        // Cleanup
        oLane.destroy();
    });

    function visibleTilesDoNotOverlap(oLane) {
        var aTiles = oLane.getTiles();
        if (aTiles.length === 0) {
            return true;
        }

        // sort to make no assumption on sorted tiles
        aTiles.sort(function (a, b) {
            return a.getLeft() - b.getLeft();
        });

        var oLastVisibleTile = null;
        for (var i = 0, l = aTiles.length; i < l; i++) {
            if (aTiles[i].getVisible()) {
                if (oLastVisibleTile !== null && oLastVisibleTile.getLeft() + oLastVisibleTile.getWidth() >= aTiles[i].getLeft()) {
                    return false;
                }
                oLastVisibleTile = aTiles[i];
            }
        }

        return true;
    }

    QUnit.test("clusterTiles()", function (assert) {
        // Arrange
        var oTile1 = new Tile();
        var oTile2 = new Tile();
        var oLane = new Lane({
            tiles: [
                oTile1,
                oTile2
            ]
        });
        var oTimeline = new Timeline({
            lanes: [
                oLane
            ]
        });

        // Act
        oLane.clusterTiles();

        // Assert
        var aActualTileVisibility = [oTile1.getVisible(), oTile2.getVisible()];
        var aExpectedTileVisibility = [true, false];
        assert.deepEqual(aActualTileVisibility, aExpectedTileVisibility, "tile visibility");

        assert.equal(oTile1.getRepresentedTiles()[1], oTile2, "first Tile also represents second Tile");
        assert.ok(visibleTilesDoNotOverlap(oLane), "visible tiles do not overlap");

        // Cleanup
        oTimeline.destroy();
        oLane.destroy();
        oTile1.destroy();
        oTile2.destroy();
    });

    QUnit.test("clusterTiles() - cluster overlapping interactions", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;

        // Arrange
        //           0  200  400  600  800  1000      pixels
        //           5  10   15   20   25   30        January 1970
        // timeline: |----------------------|
        //    tile1:    |---------|
        //    tile2:         |---------|
        // expected:    [2             ]
        var timelineScale = d3.time.scale()
          .domain([new Date("1970-01-05"), new Date("1970-01-30")])
          .range([0, 1000]);
        var oTile1 = new Tile({
            start: new Date("1970-01-10"),
            end: new Date("1970-01-20")
        });
        var oTile2 = new Tile({
            start: new Date("1970-01-15"),
            end: new Date("1970-01-25")
        });
        var oLane = new Lane({
            tiles: [
                oTile1,
                oTile2
            ]
        });
        var oTimeline = new Timeline({
            lanes: [
                oLane
            ]
        });

        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oLane.clusterTiles();

        // Assert
        var aActualTileVisibility = [oTile1.getVisible(), oTile2.getVisible()];
        var aExpectedTileVisibility = [true, false];
        assert.deepEqual(aActualTileVisibility, aExpectedTileVisibility, "tile visibility");

        var aActualTileBadgeCounts = [oTile1.getBadgeCount(), oTile2.getBadgeCount()];
        var aExpectedTileBadgeCounts = [2, 1];
        assert.deepEqual(aActualTileBadgeCounts, aExpectedTileBadgeCounts, "tile badge counts");

        assert.equal(oTile1.getRepresentedTiles()[1], oTile2, "first Tile also represents second Tile");
        assert.ok(visibleTilesDoNotOverlap(oLane), "visible tiles do not overlap");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        oTimeline.destroy();
        oLane.destroy();
        oTile1.destroy();
        oTile2.destroy();
    });

    QUnit.test("clusterTiles() - do not cluster point interactions with enough pixel distance", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;

        // Arrange
        //           0  200  500  800  1000      pixels
        //           10 12   15   18   20        January 2017
        // timeline: |-----------------|
        //    tile1:    |
        //    tile2:         |
        //    tile3:              |
        // expected:    [1 ] [1 ] [1 ]
        var timelineScale = d3.time.scale()
          .domain([new Date("2017-01-10"), new Date("2017-01-20")])
          .range([0, 1000]);
        var oTile1 = new Tile({
            start: new Date("2017-01-12"),
            end: new Date("2017-01-12")
        });
        var oTile2 = new Tile({
            start: new Date("2017-01-15"),
            end: new Date("2017-01-15")
        });
        var oTile3 = new Tile({
            start: new Date("2017-01-18"),
            end: new Date("2017-01-18")
        });
        var oLane = new Lane({
            tiles: [
                oTile1,
                oTile2,
                oTile3
            ]
        });
        var oTimeline = new Timeline({
            lanes: [
                oLane
            ]
        });
        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oLane.clusterTiles();

        // Assert
        var aActualTileVisibility = [oTile1.getVisible(), oTile2.getVisible(), oTile3.getVisible()];
        var aExpectedTileVisibility = [true, true, true];
        assert.deepEqual(aActualTileVisibility, aExpectedTileVisibility, "tile visibility");

        var aActualTileMultiplicity = [oTile1.isMultiple(), oTile2.isMultiple(), oTile3.isMultiple()];
        var aExpectedTileMultiplicity = [false, false, false];
        assert.deepEqual(aActualTileMultiplicity, aExpectedTileMultiplicity, "tile multiplicity");

        assert.ok(visibleTilesDoNotOverlap(oLane), "visible tiles do not overlap");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        oTimeline.destroy();
        oLane.destroy();
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
    });

    QUnit.test("clusterTiles() - cluster point interactions with less than enough pixel distance", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;

        // Arrange
        //           0  125 250 375 500      1000      pixels
        //           10 11  12  13  14       18        January 2017
        // timeline: |-------------------//--|
        //    tile1:    |
        //    tile2:        |
        //    tile3:            |
        //    tile3:                |
        // expected:    [2     ][2    ]
        var timelineScale = d3.time.scale()
          .domain([new Date("2017-01-10"), new Date("2017-01-18")])
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
        var oLane = new Lane({
            tiles: [
                oTile1,
                oTile2,
                oTile3,
                oTile4
            ]
        });
        var oTimeline = new Timeline({
            lanes: [
                oLane
            ]
        });
        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oLane.clusterTiles();

        // Assert
        var aActualTileVisibility = [oTile1.getVisible(), oTile2.getVisible(), oTile3.getVisible(), oTile4.getVisible()];
        var aExpectedTileVisibility = [true, false, true, false];
        assert.deepEqual(aActualTileVisibility, aExpectedTileVisibility, "tile visibility");

        var aActualTileMultiplicity = [oTile1.isMultiple(), oTile2.isMultiple(), oTile3.isMultiple(), oTile4.isMultiple()];
        var aExpectedTileMultiplicity = [true, false, true, false];
        assert.deepEqual(aActualTileMultiplicity, aExpectedTileMultiplicity, "tile multiplicity");

        var aActualTileBadgeCounts = [oTile1.getBadgeCount(), oTile2.getBadgeCount(), oTile3.getBadgeCount(), oTile4.getBadgeCount()];
        var aExpectedTileBadgeCounts = [2, 1, 2, 1];
        assert.deepEqual(aActualTileBadgeCounts, aExpectedTileBadgeCounts, "tile badge counts");

        assert.ok(visibleTilesDoNotOverlap(oLane), "visible tiles do not overlap");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        oTimeline.destroy();
        oLane.destroy();
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
        oTile4.destroy();
    });

    QUnit.test("clusterTiles() - cluster point interactions with overlapping duration interactions", function (assert) {
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
        // expected:    [4              ]
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
        var oLane = new Lane({
            tiles: [
                oTile1,
                oTile2,
                oTile3,
                oTile4
            ]
        });
        var oTimeline = new Timeline({
            lanes: [
                oLane
            ]
        });
        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oLane.clusterTiles();

        // Assert
        var aActualTileVisibility = [oTile1.getVisible(), oTile2.getVisible(), oTile3.getVisible(), oTile4.getVisible()];
        var aExpectedTileVisibility = [true, false, false, false];
        assert.deepEqual(aActualTileVisibility, aExpectedTileVisibility, "tile visibility");

        var aActualTileMultiplicity = [oTile1.isMultiple(), oTile2.isMultiple(), oTile3.isMultiple(), oTile4.isMultiple()];
        var aExpectedTileMultiplicity = [true, false, false, false];
        assert.deepEqual(aActualTileMultiplicity, aExpectedTileMultiplicity, "tile multiplicity");

        var aActualTileBadgeCounts = [oTile1.getBadgeCount(), oTile2.getBadgeCount(), oTile3.getBadgeCount(), oTile4.getBadgeCount()];
        var aExpectedTileBadgeCounts = [4, 1, 1, 1];
        assert.deepEqual(aActualTileBadgeCounts, aExpectedTileBadgeCounts, "tile badge counts");

        assert.equal(Math.round(oTile1.getWidth()), 400, "first tile has width of 400");
        assert.ok(visibleTilesDoNotOverlap(oLane), "visible tiles do not overlap");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        oTimeline.destroy();
        oLane.destroy();
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
        oTile4.destroy();
    });

    QUnit.test("clusterTiles() - cluster point interactions with overlapping duration interactions, zoomed in", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;

        // Arrange
        //           0  50     300 500 700 900 1000      pixels
        //           10 11     16  20  24  28  30        January 2017
        // timeline: |-----//------------------|
        //    tile1:    |
        //    tile2:           |-----------|
        //    tile3:               |
        //    tile4:                   |
        // expected:     [1  ] [3          ]
        var timelineScale = d3.time.scale()
          .domain([new Date("2017-01-10"), new Date("2017-01-30")])
          .range([0, 1000]);
        var oTile1 = new Tile({
            start: new Date("2017-01-11"),
            end: new Date("2017-01-11")
        });
        var oTile2 = new Tile({
            start: new Date("2017-01-16"),
            end: new Date("2017-01-28")
        });
        var oTile3 = new Tile({
            start: new Date("2017-01-20"),
            end: new Date("2017-01-20")
        });
        var oTile4 = new Tile({
            start: new Date("2017-01-24"),
            end: new Date("2017-01-24")
        });
        var oLane = new Lane({
            tiles: [
                oTile1,
                oTile2,
                oTile3,
                oTile4
            ]
        });
        var oTimeline = new Timeline({
            lanes: [
                oLane
            ]
        });
        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oLane.clusterTiles();

        // Assert
        var aActualTileVisibility = [oTile1.getVisible(), oTile2.getVisible(), oTile3.getVisible(), oTile4.getVisible()];
        var aExpectedTileVisibility = [true, true, false, false];
        assert.deepEqual(aActualTileVisibility, aExpectedTileVisibility, "tile visibility");

        var aActualTileMultiplicity = [oTile1.isMultiple(), oTile2.isMultiple(), oTile3.isMultiple(), oTile4.isMultiple()];
        var aExpectedTileMultiplicity = [false, true, false, false];
        assert.deepEqual(aActualTileMultiplicity, aExpectedTileMultiplicity, "tile multiplicity");

        var aActualTileBadgeCounts = [oTile1.getBadgeCount(), oTile2.getBadgeCount(), oTile3.getBadgeCount(), oTile4.getBadgeCount()];
        var aExpectedTileBadgeCounts = [1, 3, 1, 1];
        assert.deepEqual(aActualTileBadgeCounts, aExpectedTileBadgeCounts, "tile badge counts");

        assert.ok(visibleTilesDoNotOverlap(oLane), "visible tiles do not overlap");
        assert.equal(Math.round(oTile1.getWidth()), 200, "first tile has width of 200");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        oTimeline.destroy();
        oLane.destroy();
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
        oTile4.destroy();
    });

    QUnit.test("clusterTiles() - cluster time indicators", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels and time indicator width of 10 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;
        var originalTimeIndicatorMinWidth = Tile.TIME_INDICATOR_MIN_WIDTH;
        Tile.TIME_INDICATOR_MIN_WIDTH = 10;

        // Arrange
        //           0  200  400  600  800  1000      pixels
        //           5  10   15   20   25   30        January 1970
        // timeline: |----------------------|
        //    tile1:    |---------|
        //    tile2:         |---------|
        // expected:    |--------------|
        var timelineScale = d3.time.scale()
          .domain([new Date("1970-01-05"), new Date("1970-01-30")])
          .range([0, 1000]);
        var oTile1 = new Tile({
            start: new Date("1970-01-10"),
            end: new Date("1970-01-20")
        });
        var oTile2 = new Tile({
            start: new Date("1970-01-15"),
            end: new Date("1970-01-25")
        });
        var oLane = new Lane({
            tiles: [
                oTile1,
                oTile2
            ]
        });
        var oTimeline = new Timeline({
            lanes: [
                oLane
            ]
        });

        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oLane.clusterTiles();

        // Assert
        var aActualTimeIndicators = oTile1.getTimeIndicators();
        var aExpectedIndicators = [{
            left: 200,
            width: 600,
            numRepresentedInteractions: 2
        }];
        assert.equal(aActualTimeIndicators.length, aExpectedIndicators.length, "one time indicator is returned");
        assert.equal(Math.round(aActualTimeIndicators[0].width), aExpectedIndicators[0].width, "width of time indicator");
        assert.equal(aActualTimeIndicators[0].numRepresentedInteractions, aExpectedIndicators[0].numRepresentedInteractions, "two interactions are represented");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        Tile.TIME_INDICATOR_MIN_WIDTH = originalTimeIndicatorMinWidth;
        oTimeline.destroy();
        oLane.destroy();
        oTile1.destroy();
        oTile2.destroy();
    });

    QUnit.test("clusterTiles() - cluster point event tiles, but do not cluster time indicators", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels and time indicator width of 10 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;
        var originalTimeIndicatorMinWidth = Tile.TIME_INDICATOR_MIN_WIDTH;
        Tile.TIME_INDICATOR_MIN_WIDTH = 10;

        // Arrange
        //           0  125 250 375 500      1000      pixels
        //           10 11  12  13  14       18        January 2017
        // timeline: |-------------------//--|
        //    tile1:    |
        //    tile2:        |
        //    tile3:            |
        //    tile3:                |
        // expected:    [2     ][2    ]    (tile clusters)
        // expected:    |   |   |   |      (time indicators, not clustered)
        var timelineScale = d3.time.scale()
          .domain([new Date("2017-01-10"), new Date("2017-01-18")])
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
        var oLane = new Lane({
            tiles: [
                oTile1,
                oTile2,
                oTile3,
                oTile4
            ]
        });
        var oTimeline = new Timeline({
            lanes: [
                oLane
            ]
        });

        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oLane.clusterTiles();

        // Assert
        var aActualTimeIndicators = [oTile1.getTimeIndicators(), oTile3.getTimeIndicators()];
        var aExpectedIndicators = [
            [{ // tile1
                left: 125,
                width: 10,
                numRepresentedInteractions: 1
            }, {
                left: 250,
                width: 10,
                numRepresentedInteractions: 1
            }],
            [{ // tile 3
                left: 375,
                width: 10,
                numRepresentedInteractions: 1
            }, {
                left: 500,
                width: 10,
                numRepresentedInteractions: 1
            }]
        ];
        assert.equal(aActualTimeIndicators[0].length, aExpectedIndicators[0].length, "tile1: two time indicators are returned");
        assert.equal(Math.round(aActualTimeIndicators[0][0].width), aExpectedIndicators[0][0].width, "tile1 - 1st indicator: width of time indicator");
        assert.equal(aActualTimeIndicators[0][0].numRepresentedInteractions, aExpectedIndicators[0][0].numRepresentedInteractions, "tile1 - 1st indicator: two interactions are represented");
        assert.equal(Math.round(aActualTimeIndicators[0][1].width), aExpectedIndicators[0][1].width, "tile1 - 2nd indicator: width of time indicator");
        assert.equal(aActualTimeIndicators[0][1].numRepresentedInteractions, aExpectedIndicators[0][1].numRepresentedInteractions, "tile1 - 2nd indicator: two interactions are represented");
        assert.equal(aActualTimeIndicators[1].length, aExpectedIndicators[1].length, "tile2: two time indicators are returned");
        assert.equal(Math.round(aActualTimeIndicators[1][0].width), aExpectedIndicators[1][0].width, "tile2 - 1st indicator: width of time indicator");
        assert.equal(aActualTimeIndicators[1][0].numRepresentedInteractions, aExpectedIndicators[1][0].numRepresentedInteractions, "tile2 - 1st indicator: two interactions are represented");
        assert.equal(Math.round(aActualTimeIndicators[1][1].width), aExpectedIndicators[1][1].width, "tile2 - 2nd indicator: width of time indicator");
        assert.equal(aActualTimeIndicators[1][1].numRepresentedInteractions, aExpectedIndicators[1][1].numRepresentedInteractions, "tile2 - 2nd indicator: two interactions are represented");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        Tile.TIME_INDICATOR_MIN_WIDTH = originalTimeIndicatorMinWidth;
        oTimeline.destroy();
        oLane.destroy();
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
        oTile4.destroy();
    });

    QUnit.test("clusterTiles() - cluster point event tiles and time indicators", function (assert) {
        // note: Tests are based on a minimum tile width of 200 pixels and time indicator width of 10 pixels, setting it explicitly to guard against changes
        var originalMinWidth = Tile.MIN_WIDTH;
        Tile.MIN_WIDTH = 200;
        var originalTimeIndicatorMinWidth = Tile.TIME_INDICATOR_MIN_WIDTH;
        Tile.TIME_INDICATOR_MIN_WIDTH = 10;

        // Arrange
        //           0              100 105 110 115 120     1000      pixels
        //           1 Jan 2017     20  21  22  23  24      20        July 2017
        // timeline: |----------//----------------------//--|
        //    tile1:                |
        //    tile2:                    |-----------|
        //    tile3:                        |
        //    tile4:                            |
        // expected:                [4              ]      (tiles)
        // expected:                |---------------|      (indicators)
        var timelineScale = d3.time.scale()
          .domain([new Date("2017-01-01"), new Date("2017-07-20")]) // 200 days
          .range([0, 1000]);
        var oTile1 = new Tile({
            start: new Date("2017-01-20"),
            end: new Date("2017-01-20")
        });
        var oTile2 = new Tile({
            start: new Date("2017-01-21"),
            end: new Date("2017-01-24")
        });
        var oTile3 = new Tile({
            start: new Date("2017-01-22"),
            end: new Date("2017-01-22")
        });
        var oTile4 = new Tile({
            start: new Date("2017-01-23"),
            end: new Date("2017-01-23")
        });
        var oLane = new Lane({
            tiles: [
                oTile1,
                oTile2,
                oTile3,
                oTile4
            ]
        });
        var oTimeline = new Timeline({
            lanes: [
                oLane
            ]
        });

        // mock timeline scale
        var timelineScaleStub = sinon.stub(oTimeline, "getScale").returns(timelineScale);

        // Act
        oLane.clusterTiles();

        // Assert
        var aActualTimeIndicators = oTile1.getTimeIndicators();
        var aExpectedIndicators = [{
            left: 100,
            width: 20,
            numRepresentedInteractions: 4
        }];
        assert.equal(aActualTimeIndicators.length, aExpectedIndicators.length, "one time indicator is returned");
        assert.equal(Math.round(aActualTimeIndicators[0].width), aExpectedIndicators[0].width, "width of time indicator");
        assert.equal(aActualTimeIndicators[0].numRepresentedInteractions, aExpectedIndicators[0].numRepresentedInteractions, "four interactions are represented");

        // Cleanup
        timelineScaleStub.restore();
        Tile.MIN_WIDTH = originalMinWidth;
        Tile.TIME_INDICATOR_MIN_WIDTH = originalTimeIndicatorMinWidth;
        oTimeline.destroy();
        oLane.destroy();
        oTile1.destroy();
        oTile2.destroy();
        oTile3.destroy();
        oTile4.destroy();
    });

    QUnit.test("getValue()", function (assert) {
        // Arrange
        var oLane1 = new Lane();
        var oLane2 = new Lane({
            value: "test"
        });

        // Assert
        assert.equal(oLane1.getValue(), "", "lane value is empty");
        assert.equal(oLane2.getValue(), "test", "lane value is 'test'");

        // Cleanup
        oLane1.destroy();
        oLane2.destroy();
    });

    QUnit.test("getTimeline()", function (assert) {
        // Arrange
        var oLane1 = new Lane();
        var oLane2 = new Lane();
        var oTimeline = new Timeline({
            lanes: [
                oLane2
            ]
        });

        // Assert
        assert.strictEqual(typeof oLane1.getTimeline(), "undefined", "getTimeline returns undefined");
        assert.strictEqual(oLane2.getTimeline(), oTimeline, "getTimeline returns the parent Timeline");

        // Cleanup
        oLane1.destroy();
        oLane2.destroy();
        oTimeline.destroy();
    });

    QUnit.test("basic rendering", function (assert) {
        // Arrange
        var oLane = new Lane({
            color: ps.app.ui.lib.LaneColor.MediumOrange
        });

        // Act
        oLane.placeAt("qunit-fixture");
        sap.ui.getCore().applyChanges();

        // Assert
        assert.ok(oLane.$().hasClass("sapTlTimelineLaneFamily"), "Lane has base class");

        // Cleanup
        oLane.destroy();
    });
});
