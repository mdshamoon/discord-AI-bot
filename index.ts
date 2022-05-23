import DiscordJS from "discord.js";
import dotenv from "dotenv";
import { Octokit } from "@octokit/rest";
import { getModal } from "./utils";
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
        keyFilename: "./key.json",
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

    let messages = "";

    rows.forEach((row: any) => {
        totalContacts = totalContacts + row.contacts;
        totalMessages = totalMessages + row.messages;
        if (row.messages > 0) {
            messages =
                messages + row.organization_name + ": " + row.messages + "\n";
        }
    });

    const finalMessage =
        "-----------\n" +
        "**Date**: " +
        new Date().toLocaleDateString() +
        "\n" +
        "**Total contacts:** " +
        totalContacts +
        "\n" +
        "**Messages yesterday:** " +
        totalMessages +
        "\n\n**Messages per NGO**\n" +
        messages;

    const guildId = process.env.GUILD_ID || "";
    const channleId = process.env.CHANNEL_ID || "";

    const guild = client.guilds.cache.get(guildId);

    let channels;

    if (guild) {
        channels = guild.channels;
    } else {
        channels = client.channels;
    }

    const channel = channels.cache.get(channleId);
    if (channel?.isText()) {
        channel.send(finalMessage);
    }
};

client.on("ready", async () => {
    sendMessagetoDiscord();
});

// client.on("interactionCreate", async (interaction) => {
//     if (interaction.isMessageContextMenuCommand()) {
//         const { commandName, targetMessage } = interaction;
//         if (commandName === "Open github issue") {
//             const modal = getModal(targetMessage.content);
//             interaction.showModal(modal);
//         }
//     } else if (interaction.isModalSubmit()) {
//         const { fields } = interaction;
//         const issueTitle = fields.getField("issueTitle").value;
//         const issueDescription = fields.getField("issueDescription").value;
//         const octokit = new Octokit({
//             auth: process.env.GITHUB_ACCESS_TOKEN,
//             baseUrl: "https://api.github.com",
//         });

//         octokit.rest.issues
//             .create({
//                 owner: "mdshamoon",
//                 repo: "glific-frontend",
//                 title: issueTitle,
//                 body: issueDescription,
//             })
//             .then((res) => {
//                 interaction.reply(`Issue created: ${res.data.html_url}`);
//             });
//     }
// });

client.login(process.env.BOT_TOKEN);

cron.schedule("30 3 * * *", () => {
    sendMessagetoDiscord();
});
