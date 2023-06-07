import dotenv from "dotenv";
import DiscordJS, { ChannelType, GatewayIntentBits } from "discord.js";
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
client.on("ready", async () => { });
client.login(process.env.BOT_TOKEN);
client.on("threadCreate", async (thread) => {
    if (thread.parent?.type === ChannelType.GuildForum &&
        thread.parentId === process.env.CHANNEL_ID) {
        const firstMessage = await thread.fetchStarterMessage();
        const message = firstMessage?.content || "";
        const answer = await getAnswerFromJugalbandi(message);
        const role = thread.guild.roles.cache.find((role) => role.name === "Glific Support");
        thread.send(answer);
        thread.send(role?.toString() +
            " team please check if this needs any further attention.");
    }
});
