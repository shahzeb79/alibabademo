sap.ui.require([
    "sap/ui/test/Opa5",
    "ps/specs/integration/Common",
    "ps/specs/integration/pages/MainPage"
], function (Opa5, Common) {
    "use strict";
    Opa5.extendConfig({
        arrangements: new Common(),
        viewNamespace: "ps.app.ui.view.",
        autoWait: true
    });

    sap.ui.require([
        "ps/specs/integration/journeys/TabNavigationJourney",
        "ps/specs/integration/journeys/TimelineJourney"
    ]);
});
