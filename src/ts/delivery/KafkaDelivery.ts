

import PluginBase = require("plugin/PluginBase");
import { Producer as KafkaProducer, COMPRESSION_NONE } from "no-kafka";
import * as transit from "transit-js";

/**
 * This function connects to the designated server and posts
 * the serialization as Kafka message.
 */
export async function deliverKafka(sponsor: PluginBase,
    config: GmeConfig.GmeConfig, payload: string): Promise<GmeClasses.Result> {
    sponsor.logger.info("deliver to Kafka");

    if (!config.hasOwnProperty("deliveryUrl")) {
        return Promise.reject(new Error("No uri provided."));
    }
    let configDictionary: any = config;

    try {
        let connStr = configDictionary["deliveryUrl"];
        console.log(`connecting to: ${connStr}`);
        let producer = new KafkaProducer({
            connectionString: connStr,
            clientId: "producer",
            codec: COMPRESSION_NONE
        });
        await producer.init();

        let transitWriter = transit.writer("json");

        let topic = configDictionary["topic"];
        let keyedMessage = [{
            topic: topic, partition: 0,
            message: { key: "current model", value: transitWriter.write(payload) }
        }];
        sponsor.logger.info(`payload being written: ${topic}`);
        await producer.send(keyedMessage);

        sponsor.sendNotification(`payload ${topic} written`);
        sponsor.result.setSuccess(true);
        sponsor.sendNotification("resolved");
        return Promise.resolve(sponsor.result);

    } catch (err) {
        sponsor.sendNotification(`problem writing url: ${err.message}`);
        return Promise.reject(err.message);
    }
}
