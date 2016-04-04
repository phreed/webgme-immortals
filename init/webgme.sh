# webgme.sh
# intended to be called by init per a config file:
# webgme.service in the case of systemd
# webgme.conf in the case of upstart

  export NVM_DIR="/home/brass/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"  # This loads nvm
  cd /home/brass/projects/brass/webgme-immortals
  nvm use --delete-prefix v4.2.4
  node app.js
