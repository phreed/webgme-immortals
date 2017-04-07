#!/bin/bash

pushd /home/kafka/kafka_2.11-0.10.2.0/
./bin/kafka-console-consumer.sh \
   --bootstrap-server localhost:9092 \
   --topic "darpa.brass.immortals.vu.isis.gme" \
   --from-beginning
popd

