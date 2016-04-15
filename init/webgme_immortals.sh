## systemd Config

# webgme.sh
# intended to be called by init per a config file:
# webgme.service in the case of systemd
# webgme.conf in the case of upstart
# The home directory for the user under which this will be run

HOME_DIR=/home/fred/

# Used by node to select the appropriate configuration file
export NODE_ENV=immortals

# The location of NVM which is to be run
export NVM_DIR="$HOME_DIR/.nvm"

# Where the webgme project is located
GME_DIR=$HOME_DIR/projects/brass/webgme-immortals


[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm
cd $GME_DIR

nvm use --delete-prefix v4.2.4
node app.js
