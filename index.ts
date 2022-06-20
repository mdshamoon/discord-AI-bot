import DiscordJS, { EmbedBuilder } from "discord.js";
import dotenv from "dotenv";
import express from "express";
const { BigQuery } = require("@google-cloud/bigquery");
var cron = require("node-cron");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Github issues bot!");
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

const client = new DiscordJS.Client({
    intents: ["Guilds", "GuildMessages"],
});

const sendMessagetoDiscord = async () => {
    const bigquery = new BigQuery({
        projectId: process.env.PROJECT_ID,
        keyFilename: "./google-credentials.json",
    });
    // Queries the U.S. given names dataset for the state of Texas.

    const query =
        "SELECT * FROM `tides-saas-309509.917302307943.stats_all` where period = 'day' and inserted_at > current_date() LIMIT 100";

    // For all options, see https://cloud.google.com/bigquery/docs/reference/rest/v2/jobs/query
    const options = {
        query: query,
        // Location must match that of the dataset(s) referenced in the query.
        location: "US",
    };

    // Run the query as a job
    const [job] = await bigquery.createQueryJob(options);
    console.log(`Job ${job.id} started.`);

    // Wait for the query to finish
    const [rows] = await job.getQueryResults();

    // Print the results

    let totalContacts = 0;
    let totalMessages = 0;

    let organizationNames = "";
    let messages = "";
    let incomingVsOutgoingMessages = "";

    rows.sort((a: any, b: any) => b.messages - a.messages);

    rows.forEach((row: any) => {
        totalContacts = totalContacts + row.contacts;
        totalMessages = totalMessages + row.messages;

        if (row.messages > 0) {
            incomingVsOutgoingMessages =
                incomingVsOutgoingMessages +
                row.inbound +
                " / " +
                row.outbound +
                "\n";

            messages = messages + row.messages + "\n";
            organizationNames =
                organizationNames + row.organization_name + "\n";
        }
    });

    const guildId = process.env.GUILD_ID || "";
    const channleId = process.env.CHANNEL_ID || "";

    const guild = client.guilds.cache.get(guildId);

    let channels;

    if (guild) {
        channels = guild.channels;
    } else {
        channels = client.channels;
    }

    const finalMessage = new EmbedBuilder()
        .setColor("#0099ff")
        .setTitle("Date: " + new Date().toLocaleDateString())
        .setDescription(
            "\n\n**Total contacts:** " +
                totalContacts +
                "\n**Messages yesterday:** " +
                totalMessages
        )
        .addFields([
            {
                name: "NGO name",
                value: organizationNames,
                inline: true,
            },
            {
                name: "Messages",
                value: messages,
                inline: true,
            },
            {
                name: "Incoming / outgoing",
                value: incomingVsOutgoingMessages,
                inline: true,
            },
        ]);

    const channel = channels.cache.get(channleId);
    if (channel?.isText()) {
        channel.send({ embeds: [finalMessage] });
    }
};

client.on("ready", async () => {});

client.login(process.env.BOT_TOKEN);

cron.schedule("30 3 * * *", () => {
    sendMessagetoDiscord();
});
