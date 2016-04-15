#!/bin/bash



SYSTEMD_DIR=~/.config/systemd/user
mkdir -p $SYSTEMD_DIR
cp webgme.service  $SYSTEMD_DIR
cp webgme.socket $SYSTEMD_DIR

# ENV_DIR=/etc/default/webgme/
ENV_DIR=~/.config/webgme/
mkdir -p $ENV_DIR
# cp webgme_immortals.env $ENV_DIR

systemctl --system daemon-reload

systemctl --system enable webgme.socket
systemctl --system start webgme.socket
# systemctl status webgme.socket

# SHARE_DIR=/usr/share/webgme
SHARE_DIR=~/.config/webgme
mkdir -p $SHARE_DIR
# cp webgme_immortals.sh $SHARE_DIR

systemctl --system enable webgme.service
systemctl --system start webgme.service
# systemctl status webgme.service

journalctl -xe
