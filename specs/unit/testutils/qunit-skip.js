(function () {
    "use strict";

    // Add an option to implement skipped tests, as is available in newer QUnit
    // FUTURE: Remove with QUnit 1.16 / SAPUI5 1.30
    if (!QUnit.skip) {
        QUnit.skip = function (name) {
            QUnit.test(name + " [SKIPPED]", function () {
                QUnit.expect(0);
                var $li = jQuery("#" + QUnit.config.current.id);
                QUnit.done(function () {
                    $li.css("background-color", "#ebece9");
                });
            });
        };
    }
}());
