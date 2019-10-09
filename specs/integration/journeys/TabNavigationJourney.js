sap.ui.define([
    "sap/ui/test/opaQunit"
], function TabNavigationJourney() {
    "use strict";

    QUnit.module("TabNavigation");

    opaTest("Should see the header and IconTabBar", function (Given, When, Then) {
        // Arrangements
        Given.iStartMyApp();

        // Actions
        When.onTheMainPage.iLookAtTheScreen();

        // Assertions
        Then.onTheMainPage.iShouldSeeTheIconTabBar();
        Then.onTheMainPage.iShouldSeeTheSelectedTab("timeline");
        Then.onTheMainPage.iShouldSeeTheTab("Overview");

        Then.iTeardownMyAppFrame();
    });

});
