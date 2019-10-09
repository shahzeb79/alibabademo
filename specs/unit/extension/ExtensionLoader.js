sap.ui.require([
    "ps/app/ui/extension/InteractionExtensionBase",
    "ps/app/ui/extension/TabExtensionBase",
    "ps/app/ui/extension/ExtensionLoader",
    "sap/m/IconTabFilter"
], function ExtensionLoaderTest(InteractionExtensionBase, TabExtensionBase, ExtensionLoader, IconTabFilter) {
    "use strict";

    QUnit.module("ExtensionLoader", {
        setup: function () {
            this.oExtensionLoader = new ExtensionLoader({});
            this.oExtensionLoader.logExtensionError = function () { /* Remove opening of MessageBox */ };
        }
    });

    QUnit.test("_createInteractionExtension", function createInteractionExtensionTest(assert) {
        // Arrange
        var mExtension = this.oExtensionLoader._createExtension[ExtensionLoader.Extensions.Interaction]({
            id: "extId",
            annotations: ["some_annotation"]
        }, InteractionExtensionBase.extend("Test"));

        // Assert
        assert.strictEqual(typeof mExtension, "object", "extension object was created");
        assert.strictEqual(mExtension.id, "extId", "extension id is correct");
        assert.deepEqual(mExtension.annotations, ["some_annotation"], "extension annotations are correct");
    });

    QUnit.test("_createInteractionExtension - base class", function createInteractionExtensionTest(assert) {
        assert.throws(function () {
            this.oExtensionLoader._createExtension[ExtensionLoader.Extensions.Interaction]({
                id: "extId",
                annotations: ["some_annotation"]
            }, function Extension() { /* empty constructor */ });
        }, "Throws if the Extension is not extenting the base class");
    });

    QUnit.test("_createTabExtension", function createTabExtensionTest(assert) {
        // Arrange
        var mExtension = this.oExtensionLoader._createExtension[ExtensionLoader.Extensions.Tab]({
            id: "extId",
            key: "extKey"
        }, TabExtensionBase.extend("Test", {
            getText: function () {
                return "Text";
            },
            getContent: function () {
                return [];
            }
        }));

        // Assert
        assert.strictEqual(typeof mExtension, "object", "tab extension object was created");
        assert.strictEqual(mExtension.id, "extId", "tab extension id is correct");
        assert.strictEqual(mExtension.key, "extKey", "tab extension key is correct");
        assert.strictEqual(typeof mExtension.getTab, "function", "tab extension object has getTab function");
    });

    QUnit.test("_createTabExtension - base class", function createTabExtensionTest(assert) {
        assert.throws(function () {
            this.oExtensionLoader._createExtension[ExtensionLoader.Extensions.Tab]({
                id: "base",
                key: "key"
            }, function Extension() { /* empty constructor */ });
        }, "Throws if the Extension is not extenting the base class");
    });

    QUnit.test("_createTabExtension - text undefined", function createTabExtensionTest(assert) {
        assert.throws(function () {
            this.oExtensionLoader._createExtension[ExtensionLoader.Extensions.Tab]({
                id: "undefinedText",
                key: "key"
            }, TabExtensionBase.extend("Test", {
                getText: function () { /* empty function */ }
            }));
        }, "Throws if the Extension is not returning a text");
    });

    QUnit.test("_createTabExtension - text empty", function createTabExtensionTest(assert) {
        assert.throws(function () {
            this.oExtensionLoader._createExtension[ExtensionLoader.Extensions.Tab]({
                id: "emptyText",
                key: "key"
            }, TabExtensionBase.extend("Test", {
                getText: function () {
                    return "";
                }
            }));
        }, "Throws if the Extension is returning an empty text");
    });

    QUnit.test("_createTabExtension - control array", function createTabExtensionTest(assert) {
        var mExtension = this.oExtensionLoader._createExtension[ExtensionLoader.Extensions.Tab]({
            id: "controlArray",
            key: "key"
        }, TabExtensionBase.extend("Test", {
            getText: function () {
                return "Text";
            },
            getContent: function () {
                return [1];
            }
        }));

        assert.throws(function () {
            mExtension.getTab();
        }, "Throws if the Control array doesn't contain controls");
    });

    QUnit.test("_createTabExtension - control", function createTabExtensionTest(assert) {
        var mExtension = this.oExtensionLoader._createExtension[ExtensionLoader.Extensions.Tab]({
            id: "control",
            key: "key"
        }, TabExtensionBase.extend("Test", {
            getText: function () {
                return "Text";
            },
            getContent: function () {
                return 1;
            }
        }));

        assert.throws(function () {
            mExtension.getTab();
        }, "Throws if the Control is not a controls");
    });

    QUnit.asyncTest("_loadTabExtension - missing", function _loadExtensionTest(assert) {
        var oPromise = this.oExtensionLoader._loadExtension({
            id: "missing",
            namespace: "",
            path: ""
        }, ExtensionLoader.Extensions.Tab);

        oPromise.then(function (mExtension) {
            assert.strictEqual(typeof mExtension, "undefined", "No extension returned when Extension class is not found");
            QUnit.start();
        });
    });

    QUnit.asyncTest("_loadTabExtension - constructor", function _loadExtensionTest(assert) {
        var oPromise = this.oExtensionLoader._loadExtension({
            id: "constructor",
            namespace: "constructor",
            path: "/ps/specs/unit/extension/fixtures/constructor"
        }, ExtensionLoader.Extensions.Tab);

        oPromise.then(function (mExtension) {
            assert.strictEqual(typeof mExtension, "undefined", "No extension returned as file content is not a constructor");
            QUnit.start();
        });
    });

    QUnit.asyncTest("_loadTabExtension - base", function _loadExtensionTest(assert) {
        var oPromise = this.oExtensionLoader._loadExtension({
            id: "base",
            namespace: "base",
            path: "/ps/specs/unit/extension/fixtures/base"
        }, ExtensionLoader.Extensions.Tab);

        oPromise.then(function (mExtension) {
            assert.strictEqual(typeof mExtension, "undefined", "No extension returned as file class does not extend the correct base");
            QUnit.start();
        });
    });

    QUnit.asyncTest("_loadTabExtension - correct", function _loadExtensionTest(assert) {
        var oPromise = this.oExtensionLoader._loadExtension({
            id: "correctId",
            key: "correctKey",
            namespace: "correct",
            path: "/ps/specs/unit/extension/fixtures/correct"
        }, ExtensionLoader.Extensions.Tab);

        oPromise.then(function (mExtension) {
            var oIconTabFilter = mExtension.getTab();

            assert.strictEqual(mExtension.id, "correctId", "Id is passed");
            assert.strictEqual(mExtension.key, "correctKey", "Key is passed");
            assert.strictEqual(typeof mExtension.getTab, "function", "extension object has getTab function");
            assert.ok(oIconTabFilter instanceof IconTabFilter, "IconTabFilter is created");
            assert.strictEqual(oIconTabFilter.getText(), "Text", "IconTabFilter has correct Text");
            QUnit.start();
        });
    });

    QUnit.asyncTest("loadTabExtensions - unsupported", function loadExtensionsTest(assert) {
        var oPromise = this.oExtensionLoader.loadExtensions([], "foobar");

        oPromise.then(function (aExtensions) {
            assert.ok(aExtensions instanceof Array, "List of extensions");
            assert.strictEqual(aExtensions.length, 0, "Empty list of extensions");
            QUnit.start();
        });
    });

    QUnit.asyncTest("loadTabExtensions - none", function loadExtensionsTest(assert) {
        var oPromise = this.oExtensionLoader.loadExtensions([], ExtensionLoader.Extensions.Tab);

        oPromise.then(function (aExtensions) {
            assert.ok(aExtensions instanceof Array, "List of extensions");
            assert.strictEqual(aExtensions.length, 0, "Empty list of extensions");
            QUnit.start();
        });
    });

    QUnit.asyncTest("loadTabExtensions - correct", function loadExtensionsTest(assert) {
        var oPromise = this.oExtensionLoader.loadExtensions([{
            id: "correctId",
            key: "correctKey",
            namespace: "correct",
            path: "/ps/specs/unit/extension/fixtures/correct"
        }], ExtensionLoader.Extensions.Tab);

        oPromise.then(function (aExtensions) {
            var mExtension = aExtensions[0];
            var oIconTabFilter = mExtension.getTab();

            assert.strictEqual(mExtension.id, "correctId", "Id is passed");
            assert.strictEqual(mExtension.key, "correctKey", "Key is passed");
            assert.strictEqual(typeof mExtension.getTab, "function", "extension object has getTab function");
            assert.ok(oIconTabFilter instanceof IconTabFilter, "IconTabFilter is created");
            assert.strictEqual(oIconTabFilter.getText(), "Text", "IconTabFilter has correct Text");
            QUnit.start();
        });
    });

    QUnit.asyncTest("loadTabExtensions - failing", function loadExtensionsTest(assert) {
        var oPromise = this.oExtensionLoader.loadExtensions([{}, {}], ExtensionLoader.Extensions.Tab);

        oPromise.then(function (aExtensions) {
            assert.ok(aExtensions instanceof Array, "List of extensions");
            assert.strictEqual(aExtensions.length, 0, "Empty list of extensions");
            QUnit.start();
        });
    });

    QUnit.asyncTest("loadTabExtensions - half-half", function loadExtensionsTest(assert) {
        var oPromise = this.oExtensionLoader.loadExtensions([{}, {
            id: "correctId",
            key: "correctKey",
            namespace: "correct",
            path: "/ps/specs/unit/extension/fixtures/correct"
        }], ExtensionLoader.Extensions.Tab);

        oPromise.then(function (aExtensions) {
            assert.ok(aExtensions instanceof Array, "List of extensions");
            assert.strictEqual(aExtensions.length, 1, "One valid extension");

            var mExtension = aExtensions[0];
            var oIconTabFilter = mExtension.getTab();

            assert.strictEqual(mExtension.id, "correctId", "Id is passed");
            assert.strictEqual(mExtension.key, "correctKey", "Key is passed");
            assert.strictEqual(typeof mExtension.getTab, "function", "extension object has getTab function");
            assert.ok(oIconTabFilter instanceof IconTabFilter, "IconTabFilter is created");
            assert.strictEqual(oIconTabFilter.getText(), "Text", "IconTabFilter has correct Text");
            QUnit.start();
        });
    });
});
