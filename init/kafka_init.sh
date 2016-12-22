#!/bin/bash

pushd /opt/kafka/kafka_2.11-0.10.1.0/
./bin/kafka-topics.sh --create --zookeeper localhost:2181 --replication-factor 1 --partitions 1 --topic "vu-isis_gme_brass_immortals"
popd

