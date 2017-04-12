#!/bin/bash

pushd /home/kafka/kafka_2.11-0.10.2.0/
./bin/kafka-topics.sh \
    --create \
    --zookeeper localhost:2181 \
    --replication-factor 1 \
    --partitions 1 \
    --topic "immortals.model"
popd

