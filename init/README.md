
WebGME can be run as a service on Ubuntu.

https://wiki.ubuntu.com/SystemdForUpstartUsers

#### systemd (Ubuntu >=16.04)
The recommended way to run webgme as a service is with systemd.
The scripts presume that the project has been cloned into
'/home/brass/projects/brass/webgme_immortals'.
If that is not the case then
the 'init/webgme.service' and 'init/webgme_immortals.sh'
files will need to be adjusted.
The following commands need to be run as root.

```bash
PROJ_DIR=/home/brass/projects/brass/webgme-immortals
SYSTEMD_DIR=/etc/systemd/system
mkdir -p ${SYSTEMD_DIR}
cp ${PROJ_DIR}/webgme.service ${SYSTEMD_DIR}
cp ${PROJ_DIR}/webgme.socket ${SYSTEMD_DIR}

systemctl --system daemon-reload

systemctl --system enable webgme.socket
systemctl --system start webgme.socket

systemctl --system enable webgme.service
# systemctl --system start webgme.service
# systemctl status webgme.service

```

Some notes are in order:
SYSTEM_DIR may refer to one of a few folders:
    * /etc/systemd/system/  : use this location unless making a *.deb package
    * /lib/systemd/system/  : this is for use by *.deb packages

