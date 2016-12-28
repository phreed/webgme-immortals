#!/bin/bash

node ./dist-client/main/run_plugin.js \
  StreamPlugin \
  immortals_v03_cp02_network \
  --owner fred \
  --user fred \
  --branchName master
