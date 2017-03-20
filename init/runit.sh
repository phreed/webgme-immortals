#!/bin/bash

export NODE_ENV=immortals
pushd .
[[ -d ./log ]] || mkdir ./log
node ./dist-client/main/app_bootstrap.js
popd