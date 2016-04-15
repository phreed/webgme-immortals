### Setup WebGME Servers

#### sysvinit

This init mechanism is not supported.

#### Upstart

Copy the webgme.conf file to '/etc/init/webgme.conf'.
```bash
sudo service webgme start
```

#### systemd

Still a work in progress.
