
### Quick Start ###

In the following "I" represents the configuration used by
the author of this document.
"You" should feel free to change "I"'s settings.
I run the following commands to install on Ubuntu.

  sudo apt-get install mongodb-server

  mkdir -p ~/projects/brass
  cd ~/projects/brass
  git clone git@git.isis.vanderbilt.edu:immortals/webgme-immortals.git
  cd webgme-immortals

  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
  nvm install v4.2.4
  nvm use v4.2.4

  npm install

  webgme start


webGME and its derivatives are node.js applications which
use mongodb as the backing store and git for version-control.
Development and operation are possible on MS-Windows and Mac-OSX.
The following instructions are for Ubuntu 16.04 (which I use).

  sudo apt-get install mongodb-server
  sudo apt-get install git

Clone the webgme-immortals project into an appropriate place.
I work in a project folder and clone projects into that:
  mkdir -p ~/projects/brass
  cd ~/projects/brass

  git clone git@git.isis.vanderbilt.edu:immortals/webgme-immortals.git

WebGME does not closely track node.js nor npm therefore it is
useful to use the node-version-manager (nvm https://github.com/creationix/nvm)
to establish a consistent set of Javascript packages.

  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash

Once nvm installed the appropriate bundle for webGME is enabled.

  nvm install v4.2.4
  nvm use v4.2.4

Now we can get the webgme-setup-tool which includes the 'webgme' tool.

  npm install -g webgme-setup-tool

Update all the npm packages within the webgme-immortals directory.
This establishes a set of node_modules specifically for the project.

  cd ~/projects/brass/webgme-immortals
  npm install

Things are now configured to start the webGME server.
Pay attention to the output as the URL for connecting
to the 'gme web server' will be written stdout.

  webgme start

Ctrl-C is used to shut the server down.
Some changes to the running system will necessitate restarting the server.
This includes changes to the packages listed in 'packages.json' (npm),
or 'bower.json'.
Changes to Javascript or CSS will only require an refresh on the browser.

### Samples ###

There are a few sample projects in...
webgme-immortals/samples/model/
...notably ./deployment_model/webgme/immortals_dm_v2_master.json
See the accompanying README.md for more information.
