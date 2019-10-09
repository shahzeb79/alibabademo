# Welcome to Patient Summary Application UI

In the Patient Summary application, you can view basic data about the patient and specific information about their interactions with medical professionals. Within the available tab views, interactions are grouped into color-coded categories, such as diagnostics or treatments. The number of interactions a patient has had in each category is also shown.

[![Build Status](https://travis-ci.mo.sap.corp/HCN/ps-app-ui.svg?token=W1E9NqHG4y9UxPeGHQpN&amp;branch=master)](https://travis-ci.mo.sap.corp/HCN/ps-app-ui)

## Getting started
The project includes a local development environment which mocks dependencies to other services. To serve the UI and run the mocked service dependencies, use the command:
```
npm run dev
```

The UI is now available on [localhost:8000/ps/app/ui/](http://localhost:8000/ps/app/ui/).

_Note:_ You can also open the patient summary for other mocked patients by adding the query parameter `pid`. e.g.: [localhost:8000/ps/app/ui?pid=8](http://localhost:8000/ps/app/ui/?pid=8).

You can now also run the unit and integration tests in your browser via the following URLs:

* **Unit tests**: [http://localhost:8001/ps/specs/unit/unitTests.qunit.html](http://localhost:8001/ps/specs/unit/unitTests.qunit.html)
* **Integration tests**: [http://localhost:8001/ps/specs/integration/opaTests.qunit.html](http://localhost:8001/ps/specs/integration/opaTests.qunit.html)
## Code organisation

* **demo/** Contains a shell with Patient Summary for local development and demo purposes
* **mocks/** Contains the mocks for underlaying services for local development
* **specs/** Contains the unit and integration tests (in respective sub-directories)
* **src/** Contains the source code for the ui itself

## Testing
The project includes a suite of unit  (QUnit) and integration (OPA5) tests in the directory *specs/*. To run the entire suite on the commanline, use the command
```
npm test
```

(see below for the NPM commands to run just one type of tests). You can also run the tests in your browser -  see the section "Getting started" above.


## Linting
We use [ESLint](http://eslint.org/) for linting the JavaScript code. The different settings for source code, specs and node scripts are stored in the *.eslint* directory at root level.

## Grunt and NPM tasks
The core build tasks are exposed as NPM commands:

* `npm run dev`: Start the local development setup. Serves the UI and starts the mocked services for dependencies
* `npm run lint`: Run ESLint on the JavaScript code
* `npm test`: Run the full test suite
* `npm run unit_test`: Run the unit tests
* `npm run integration_test`: Run the integration tests
* `npm run styles`: Compile CSS stylesheets

Under the hood, we use [Grunt](https://gruntjs.com/) to run the build tasks. Look into *gruntfile.js* for a full overview over the available tasks.

## Travis CI configuration for continuous integration
The project includes a configuration for Travis CI (the file *.travis.yml* at root level). It instructs Travis to build the project run `npm test` for commits on the *master* branch and pull requests.


## Pre-configured tasks and launch configurations for Visual Studio Code
We use [Visual Studio Code](https://code.visualstudio.com/) for development. The project therefore also includes pre-configured build tasks that run the key NPM and Grunt tasks (*.vscode/tasks.json*). To access the tasks, press *Ctrl + Shift + p* in VS Code and search for "tasks".

