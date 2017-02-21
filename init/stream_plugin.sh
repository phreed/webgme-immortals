#!/bin/bash

function stream_network {
node ./dist-client/main/run_plugin.js \
  StreamPlugin \
  immortals_v03_cp02_network \
  --owner fred \
  --user fred \
  --branchName master
}

function stream_feature {
node ./dist-client/main/run_plugin.js \
  StreamPlugin \
  immortals_v03_cp02_network \
  --owner fred \
  --user fred \
  --branchName master
}

select stream in "feature" "network" "exit"
do
  case "$stream" in
  ("exit") break;;
  ("feature") stream_feature;;
  ("network") stream_network;;
  (*) echo "bad stream request";;
  esac
done
exit 0


