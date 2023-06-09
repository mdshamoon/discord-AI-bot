import dotenv from "dotenv";
import DiscordJS, { ApplicationCommandOptionType, ChannelType, EmbedBuilder, GatewayIntentBits, } from "discord.js";
import axios from "axios";
import express from "express";
import bodyParser from "body-parser";
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
app.post("/chat", async (req, res) => {
    const user_input = req.body.user_input;
    res(getAnswerFromJugalbandi(user_input));
});
const getAnswerFromJugalbandi = async (message) => {
    const apiUrl = process.env.API_URL;
    const params = {
        uuid_number: process.env.GLIFIC_DOC_UUID || "",
        query_string: encodeURIComponent(message),
    };
    // Convert the params object into a query string
    const queryParams = new URLSearchParams(params).toString();
    try {
        const result = await axios.get(`${apiUrl}?${queryParams}`, {
            timeout: 120000,
        });
        return result.data.answer;
    }
    catch (e) {
        return "Sorry, I am not able to answer this question due to timeout in API. Please try again later.";
    }
};
const client = new DiscordJS.Client({
    intents: ["Guilds", "GuildMessages", GatewayIntentBits.MessageContent],
});
async function registerCommand() {
    try {
        // Fetch the guild (server) where the bot is connected
        const guild = client.guilds.cache.get(process.env.GUILD_ID || "");
        if (guild) {
            // Create the command
            const command = await guild.commands.create({
                name: "askglific",
                description: "Ask a question to GPT model",
                options: [
                    {
                        name: "question",
                        description: "The question you want to ask",
                        type: ApplicationCommandOptionType.String,
                        required: true,
                    },
                ],
            });
            console.log(`Registered command: ${command.name}`);
        }
    }
    catch (error) {
        console.error("Error registering command:", error);
    }
}
// Event that triggers when a user interacts with a registered command
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand())
        return;
    // Handle the askGPT command
    if (interaction.commandName === "askglific") {
        // Join the arguments to form the user's question
        const question = interaction.options.get("question")?.value?.toString();
        if (question) {
            interaction.reply({
                content: `Your question **${question}** is getting processed...`,
                ephemeral: false,
            });
            const answer = await getAnswerFromJugalbandi(question);
            await interaction.followUp(answer);
        }
        else {
            interaction.reply("Unable to answer the query");
        }
    }
});
client.on("ready", async () => {
    registerCommand();
});
client.login(process.env.BOT_TOKEN);
client.on("threadCreate", async (thread) => {
    if (thread.parent?.type === ChannelType.GuildForum &&
        thread.parentId === process.env.CHANNEL_ID) {
        const firstMessage = await thread.fetchStarterMessage();
        const message = firstMessage?.content || "";
        const startingMessage = new EmbedBuilder()
            .setColor("#0099ff")
            .setTitle("Please add the following details in case the issue is related to a contact/flow")
            .setDescription("\n\n**In case of flow:** " +
            "link of the flow and the contact for which the issue was faced" +
            "\n**In case of contact:** " +
            "link of the chat for the contact" +
            "\n\nMeanwhile we are looking into your query and we will revert back soon");
        await thread.send({ embeds: [startingMessage] });
        thread.sendTyping();
        const answer = await getAnswerFromJugalbandi(message);
        const role = thread.guild.roles.cache.find((role) => role.name === "Glific Support");
        thread.send(answer);
        thread.send(role?.toString() +
            " team please check if this needs any further attention.");
    }
});
