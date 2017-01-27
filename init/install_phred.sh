#!/bin/bash

# export SYSTEMD_DIR=/usr/local/systemd/system/
export SYSTEMD_DIR=/lib/systemd/system/
mkdir -p $SYSTEMD_DIR
cp webgme.service.phred ${SYSTEMD_DIR}webgme.service
cp webgme.socket.phred ${SYSTEMD_DIR}webgme.socket

systemctl --system daemon-reload

systemctl --system stop webgme.socket
systemctl --system stop webgme.service

systemctl --system enable webgme.socket
systemctl --system start webgme.socket
# systemctl status webgme.socket

systemctl --system enable webgme.service
# systemctl --system start webgme.service
# systemctl status webgme.service

# journalctl -xe
