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
  git clone https://github.com/phreed/webgme-immortals.git
  cd webgme-immortals

  curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.1/install.sh | bash
  nvm install v6.10.0
  nvm use v6.10.0

  npm install

  tsc
  gulp
```

Running webgme as a user process is simply performed: 
```bash
  ./init/runit.sh
```

You should now be able to connect to the running webGME server, http://127.0.0.1:3000

There are a couple of other things that should be done to run
webgme as it is intented to be run.
One is setting up proper authentication which is covered in the following section.
The other is to make webgme a proper systemd service.


#### Authentication

The authentication scheme for Json Web Token uses OpenSSL RSA256 keys. 
The config for the editor is set up to find a public and private key in
the files `private_key` and `public_key` inside 
a folder named `token_keys` next to the folder containing 
the webgme git repository.
```bash
pushd ..
mkdir token_keys
openssl genrsa -out token_keys/private_key 1024
openssl rsa -in token_keys/private_key -pubout > token_keys/public_key
popd
```
To be clear, the location of the token_keys and 
authentication generally is controlled in
`/webgme/src/ts/config/config.immortals.ts`


### Long Running Service

see brass/webgme-immortals/init/README.md

### Samples ###

There are a few sample projects...
webgme-immortals/samples/README.md

### Slow Start (explanations provided)

webGME and its derivatives are node.js applications which
use mongodb as the backing store and git for version-control.
Development and operation are possible on MS-Windows and Mac-OSX.
The following instructions are for Ubuntu 16.10 (which I use).
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

  git clone https://github.com/phreed/webgme-immortals.git

  cd webgme-immortals
```
WebGME does not closely track node.js nor npm therefore it is
useful to use the node-version-manager (nvm https://github.com/creationix/nvm)
to establish a consistent set of Javascript packages.
If you will be working on this for a while it is better to do a manual install.

```bash
  export NVM_DIR="${HOME}/.nvm" && (
  git clone https://github.com/creationix/nvm.git "${NVM_DIR}"
  cd "${NVM_DIR}"
  git checkout `git describe --abbrev=0 --tags --match "v[0-9]*" origin`
) && . "${NVM_DIR}/nvm.sh"
```

Add the following lines to your ~/.bashrc, ~/.profile, or ~/.zshrc file.
This will source nvm automatically upon login.
(You may have to add to more than one of the mentioned files)
```
export NVM_DIR="${HOME}/.nvm"
[ -s "${NVM_DIR}/nvm.sh" ] && . "${NVM_DIR}/nvm.sh" # This loads nvm
```

**Close and reopen your terminal to start using nvm (or source .bashrc).**

Once nvm installed the appropriate bundle for webGME is enabled.
```bash
  nvm install v6.10.0
  nvm use v6.10.0
```

Update all the npm packages within the webgme-immortals directory.
This establishes a set of node_modules specifically for the project.
```bash
  cd ~/projects/brass/webgme-immortals
  npm install
```
We also need to build the javascript from the typescript.
```bash
  tsc
  gulp
```

Things are now configured to start the webGME server.
Pay attention to the output as the URL for connecting
to the 'gme web server' will be written stdout.
```bash
   export NODE_ENV=immortals
   pushd .
   [[ -d ./log ]] || mkdir ./log
   node ./dist-client/main/app_bootstrap.js
   popd
```
Ctrl-C is used to shut the server down.

You should now be able to connect to the running webGME server, http://127.0.0.1:3000

Some changes to the running system will necessitate restarting the server.
This includes changes to the packages listed in 'packages.json' (npm),
or 'bower.json'.
Changes to Javascript or CSS will only require an refresh on the browser.


