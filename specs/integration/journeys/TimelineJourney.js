/* global opaTest */// declare unusual global vars for JSLint/SAPUI5 validation
"use strict";

QUnit.module("Patient Summary Timeline");

opaTest("Should see the master data in the header for patient 1", function (given, when, then) {
    // Arrangements
    given.iStartMyApp("1");

    // Actions
    when.onTheMainPage.iLookAtTheScreen();

    // Assertions
    then.onTheMainPage.iShouldSeeThePatientHeader("Test Subject");
    then.onTheMainPage.iShouldSeeThePatientSubHeaders([
        "A City",
        "01234"
    ]);
    then.iTeardownMyAppFrame();
});

opaTest("Should see the master data in the header for patient 2", function (given, when, then) {
    // Arrangements
    given.iStartMyApp("2");

    // Actions
    when.onTheMainPage.iLookAtTheScreen();

    // Assertions
    then.onTheMainPage.iShouldSeeThePatientHeader("Carolyn Rodriguez");
    then.onTheMainPage.iShouldSeeThePatientSubHeaders([
        "City, Another City",
        "91243"
    ]);
    then.iTeardownMyAppFrame();
});

opaTest("Should see one toggle button in the bar per configured lane", function (given, when, then) {
    // Arrangements
    given.iStartMyApp("1");

    // Actions
    when.onTheMainPage.iLookAtTheScreen();

    // Assertions
    then.onTheMainPage.iShouldSeeAToggleForLane("Lane 1", 11);
    then.onTheMainPage.iShouldSeeAToggleForLane("Lane 2", 7);
    then.onTheMainPage.iShouldSeeAToggleForLane("Lane 3", 18);

    then.iTeardownMyAppFrame();
});

opaTest("Should see one lane per configured lane", function (given, when, then) {
    // Arrangements
    given.iStartMyApp("1");

    // Actions
    when.onTheMainPage.iLookAtTheScreen();

    // Assertions
    then.onTheMainPage.iShouldSeeALane("Lane 1");
    then.onTheMainPage.iShouldSeeALane("Lane 2");
    then.onTheMainPage.iShouldSeeALane("Lane 3");

    then.iTeardownMyAppFrame();
});

opaTest("Should see a collapsed lane for lanes with tiles-hidden option set", function (given, when, then) {
    // Arrangements
    given.iStartMyApp("1");

    // Actions
    when.onTheMainPage.iLookAtTheScreen();

    // Assertions
    then.onTheMainPage.iShouldSeeACollapsedLane("Lane 2");
    then.onTheMainPage.iShouldSeeANonCollapsedLane("Lane 1");
    then.onTheMainPage.iShouldSeeANonCollapsedLane("Lane 3");

    then.iTeardownMyAppFrame();
});
opaTest("Should see the number of tiles in the lane header for lanes without tiles-hidden option set", function (given, when, then) {
    // Arrangements
    given.iStartMyApp("1");

    // Actions
    when.onTheMainPage.iLookAtTheScreen();

    // Assertions
    then.onTheMainPage.iShouldSeeTheInteractionCountOnTheLane("Lane 1", 11);
    then.onTheMainPage.iShouldSeeTheInteractionCountOnTheLane("Lane 3", 18);

    then.iTeardownMyAppFrame();
});
opaTest("Should have the interactions associated with the right lanes", function (given, when, then) {
    // Arrangements
    given.iStartMyApp("1");

    // Actions
    when.onTheMainPage.iLookAtTheScreen();

    // Assertions
    then.onTheMainPage.iShouldHaveTheInteractionsAssignedToTheLane("Lane 1", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    then.onTheMainPage.iShouldHaveTheInteractionsAssignedToTheLane("Lane 2", [12, 13, 14, 15, 16, 17, 18]);
    then.onTheMainPage.iShouldHaveTheInteractionsAssignedToTheLane("Lane 3", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]);

    then.iTeardownMyAppFrame();
});
opaTest("Should have the interactions split correctly into dated/undated", function (given, when, then) {
    // Arrangements
    given.iStartMyApp("2");

    // Actions
    when.onTheMainPage.iLookAtTheScreen();

    // Assertions
    then.onTheMainPage.iShouldHaveTheInteractionsAssignedToTheLane("Lane 1", [2, 3]);
    then.onTheMainPage.iShouldHaveDatelessInteractionsInUndatedModelSection("Lane 1", [1]);

    then.iTeardownMyAppFrame();
});
