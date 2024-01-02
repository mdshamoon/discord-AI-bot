import dotenv from "dotenv";
import DiscordJS, {
    ApplicationCommandOptionType,
    ChannelType,
    GatewayIntentBits,
} from "discord.js";
import axios from "axios";
import express from "express";
import { GoogleAuth } from "google-auth-library";
import { google } from "googleapis";
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

const defaultPrompt = `You are NGO Support bot, an intelligent AI assistant built by Glific team to help NGOs who use Glific's chatbot platform. You will respond to questions which are “NGO queries” on Glific's discord channel. Give answers in a language that can be understood by a 21 year old, reference the knowledge base which comprises of Glific's documentation, examples of NGO queries and satisfactory responses generated by the team and a list of all the links to relevant web pages on Glific's documentation webpage. You can follow the guidelines shared to form your answer.  Guidelines:  Please ask the user once for the flow name to improve your answer to their questions. Try to identify the keywords which indicate a specific issue being faced with a specific feature or service of the Glific platform Obtain Search Results most relevant to identified keywords in the NGO query Make sure to use only the Search Results to produce a coherent answer If the Search Results provide insufficient information, refuse to answer the question and redirect the user to https://glific.github.io/docs/docs/intro for more help.  Summarise the response generated in 2000 characters and ensure all important information is conveyed in the response to NGO query. In your response share the identified keywords used to obtain search results Include only one most relevant link in your response to take the user to most relevant documentation on Glific's webpage. For example, for an NGO query about “How do I get my whatsapp account verified?” in the response generated, include an excerpt like shared below under triple quotes to in the response.  ‘’’ more information on this topic can be found on the glific documentation, follow this link https://glific.github.io/docs/docs/FAQ/How%20to%20get%20Green%20Tick%20in%20Whatsapp%20Business/ to know more ‘’’`;
const categoryPrompt = `You are an intelligent AI assistant built by Glific team to help Glific"s team analyze the incoming  queries on Glific"s NGO-support channel on discord. Glific is a chatbot platform and the discord channel for NGOs using the chatbot to share their issues and seek support. You will get NGO query as input, your main purpose is to analyze the query and categorize or tag  the query raised in top 3 most relevant categories and also share your thinking for choosing the most relevant tag in the Reason attribute

Generate the output in following JSON format and don't add any other words apart from the output in the following format

{
"Most relevant tag": "Tag 1",
"2nd most relevant tag": " Tag 2",
"3rd most relevant tag": "Tag 3",
"Reason": " Reason for selecting the tags"
}

Here are a few examples for few NGO queries
Example 1:
{
"Most relevant tag": "Knowledge",
"2nd most relevant tag":"Whatsapp Manager",
"3rd most relevant tag":"",
"Reason":""
}
Example 2: 
{
"Most relevant tag": "Fb verification",
"2nd most relevant tag":"1-1 support",
"3rd most relevant tag":"",
"Reason":"",
}
Example 3: 
{
"Most relevant tag": "Bug",
"2nd most relevant tag":"Profiles",
"3rd most relevant tag":"Not urgent",
"Reason":""
}
`;

const writeDataToSheets = async (
    question: string,
    answer: string,
    category: string,
    author: string
) => {
    const auth = new GoogleAuth({
        scopes: "https://www.googleapis.com/auth/spreadsheets",
        credentials: {
            client_email: process.env.GCP_CLIENT_EMAIL,
            private_key: process.env.GCP_PRIVATE_KEY?.split("\\n").join("\n"),
        },
    });

    let tag1 = "";
    let tag2 = "";
    let tag3 = "";
    let reason = "";

    try {
        const values = JSON.parse(category);
        tag1 = values["Most relevant tag"];
        tag2 = values["2nd most relevant tag"];
        tag3 = values["3rd most relevant tag"];
        reason = values["Reason"];
    } catch (error) {}

    const service = google.sheets({ version: "v4", auth });
    let values = [
        [
            new Date(),
            author,
            question,
            tag1,
            tag2,
            tag3,
            reason,
            category,
            answer,
        ],
    ];
    const requestBody = {
        values,
    };
    try {
        const result = await service.spreadsheets.values.append({
            spreadsheetId: process.env.SPREADSHEET_ID || "",
            range: "A:J",
            valueInputOption: "RAW",
            requestBody,
        });
        console.log("%d cells updated.", result.data.updates?.updatedCells);
        return result;
    } catch (err) {
        // TODO (Developer) - Handle exception
        throw err;
    }
};

app.post("/chat", async (req: any, res: any) => {
    const user_input = req.body.user_input;

    res(getAnswerFromJugalbandi(user_input, ""));
});

const getAnswerFromJugalbandi = async (message: string, prompt: string) => {
    const apiUrl = process.env.API_URL;

    const params = {
        uuid_number: process.env.GLIFIC_DOC_UUID || "",
        query_string: encodeURIComponent(message),
        prompt: encodeURIComponent(prompt),
    };
    // Convert the params object into a query string
    const queryParams = new URLSearchParams(params).toString();

    try {
        const result = await axios.get(`${apiUrl}?${queryParams}`, {
            timeout: 120000,
        });
        return result.data.answer;
    } catch (e) {
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
    } catch (error) {
        console.error("Error registering command:", error);
    }
}

// Event that triggers when a user interacts with a registered command
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isCommand()) return;

    // Handle the askGPT command
    if (interaction.commandName === "askglific") {
        // Join the arguments to form the user's question
        const question = interaction.options.get("question")?.value?.toString();
        if (question) {
            interaction.reply({
                content: `Your question **${question}** is getting processed...`,
                ephemeral: false,
            });

            const answer = await getAnswerFromJugalbandi(
                question,
                defaultPrompt
            );
            await interaction.followUp(answer);
        } else {
            interaction.reply("Unable to answer the query");
        }
    }
});

client.on("ready", async () => {
    registerCommand();
});
client.login(process.env.BOT_TOKEN);

client.on("threadCreate", async (thread) => {
    if (
        thread.parent?.type === ChannelType.GuildForum &&
        thread.parentId === process.env.CHANNEL_ID
    ) {
        const firstMessage = await thread.fetchStarterMessage();
        const message = firstMessage?.content || "";
        const author = firstMessage?.author.username || "";

        thread.sendTyping();

        const answer = await getAnswerFromJugalbandi(message, defaultPrompt);
        const role = thread.guild.roles.cache.find(
            (role) => role.name === "Glific Support"
        );
        thread.send(answer);
        thread.send(
            role?.toString() +
                " team please check if this needs any further attention."
        );
        const category = await getAnswerFromJugalbandi(message, categoryPrompt);
        await writeDataToSheets(message, answer, category, author);
    }
});
