
WebGME can be run as a service on Ubuntu.
It makes use of 'upstart' (<16.04) and 'systemd' (>= 16.04).

#### Upstart (Ubuntu <16.04)
Copy the webgme files to their appropriate locations.
The config file may need to be updated based on where your
webgme-immortals project resides.
```bash
sudo cp ./init/webgme.conf /etc/init/webgme.conf
```
Fire it up!
```bash
# service webgme start
```


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
SYSTEMD_DIR=/lib/systemd/system
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
