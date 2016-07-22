### Quick Start ###

In the following "I" represents the configuration used by
the author of this document.
"You" should feel free to change "I"'s settings.
I run the following commands to install the prerequisites on Ubuntu.
```bash
  sudo apt-get install mongodb-server
  sudo apt-get install mongodb-clients
  sudo apt-get install git
```
Clone the repository into an appropriate place and build the application.
```bash
  mkdir -p ~/projects/brass
  cd ~/projects/brass
  git clone https://git.isis.vanderbilt.edu/immortals/webgme-immortals.git
  cd webgme-immortals

  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
  nvm install v4.2.4
  nvm use v4.2.4

  npm install
```
If you want to run the application to see if it works.
```bash
  webgme start
```

webGME and its derivatives are node.js applications which
use mongodb as the backing store and git for version-control.
Development and operation are possible on MS-Windows and Mac-OSX.
The following instructions are for Ubuntu 16.04 (which I use).
Note that mongodb-clients is not necessary but it can be useful.
```bash
  sudo apt-get install mongodb-server
  sudo apt-get install mongodb-clients
  sudo apt-get install git
```
Clone the webgme-immortals project into an appropriate place.
I work in a project folder and clone projects into that:
```bash
  mkdir -p ~/projects/brass
  cd ~/projects/brass

  git clone https://git.isis.vanderbilt.edu/immortals/webgme-immortals.git
  git clone git@git.isis.vanderbilt.edu:immortals/webgme-immortals.git

  cd webgme-immortals
```
WebGME does not closely track node.js nor npm therefore it is
useful to use the node-version-manager (nvm https://github.com/creationix/nvm)
to establish a consistent set of Javascript packages.
```bash
  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.0/install.sh | bash
```
**Close and reopen your terminal to start using nvm (or source .bashrc).**

Once nvm installed the appropriate bundle for webGME is enabled.
```bash
  nvm install v4.2.4
  nvm use v4.2.4
```
It may be necessary to disable the prefix.
```bash
nvm use --delete-prefix v4.2.4
```

Some of the tasks use the webgme-cli which includes the 'webgme' tool.
```bash
  npm install -g webgme-cli
```

Update all the npm packages within the webgme-immortals directory.
This establishes a set of node_modules specifically for the project.
```bash
  cd ~/projects/brass/webgme-immortals
  npm install
```
Things are now configured to start the webGME server.
Pay attention to the output as the URL for connecting
to the 'gme web server' will be written stdout.
```bash
  webgme start
```
Ctrl-C is used to shut the server down.
Some changes to the running system will necessitate restarting the server.
This includes changes to the packages listed in 'packages.json' (npm),
or 'bower.json'.
Changes to Javascript or CSS will only require an refresh on the browser.

### Long Running Service

see brass/webgme-immortals/init/README.md

### Samples ###

There are a few sample projects in...
webgme-immortals/samples/model/
...notably ./deployment_model/webgme/immortals_dm_v2_master.json
See the accompanying README.md for more information.

### Creating User Accounts ###
By default webgme starts with a single user, 'guest',
additional users can be added with the 'usermanager'.

```bash
node node_modules/webgme/src/bin/usermanager.js -h
```

```bash
node node_modules/webgme/src/bin/usermanager.js useradd --canCreate foo foo@bar.org foopass
node node_modules/webgme/src/bin/usermanager.js organizationadd baz
node node_modules/webgme/src/bin/usermanager.js usermod_organization_add foo baz
```
