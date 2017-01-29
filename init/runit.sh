#!/bin/bash

export NODE_ENV=immortals
pushd .
node ./dist-client/main/app_bootstrap.js
popd