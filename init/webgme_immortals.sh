## systemd Config

# webgme.sh
# intended to be called by init per a config file:
# webgme.service in the case of systemd
# webgme.conf in the case of upstart
# The home directory for the user under which this will be run
#
echo `pwd`
if [ -s /home/fred ]; then
  export HOME_DIR="/home/fred";
elif [ -s /isis/home/brass ]; then
  export HOME_DIR="/isis/home/brass";
else
  echo "no appropriate home directory";
  exit 2
fi

# Used by node to select the appropriate configuration file
export NODE_ENV=immortals

# The location of NVM which is to be run
export NVM_DIR="$HOME_DIR/.nvm"

# Where the webgme project is located
export GME_DIR=$HOME_DIR/projects/brass/webgme-immortals

[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm
cd $GME_DIR

echo "running nvm"
nvm use v6.4.0
echo "running node"
node app.js

echo "webgme started"

