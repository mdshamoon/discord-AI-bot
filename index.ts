import dotenv from "dotenv";
import DiscordJS, {
    ApplicationCommandOptionType,
    GatewayIntentBits,
} from "discord.js";
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

const client = new DiscordJS.Client({
    intents: ["Guilds", "GuildMessages"],
});

async function registerCommand() {
    try {
        // Fetch the guild (server) where the bot is connected

        const guild = client.guilds.cache.get(process.env.GUILD_ID || "");

        if (guild) {
            // Create the command
            const command = await guild.commands.create({
                name: "post",
                description: "Share the post link",
                options: [
                    {
                        name: "link",
                        description: "Share the post link",
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

    if (interaction.commandName === "post") {
        // Join the arguments to form the user's question
        const linkOfPost = interaction.options.get("link")?.value?.toString();

        const role =
            interaction.guild &&
            interaction.guild.roles.cache.find(
                (role) => role.name === "Tech4Dev Team"
            );
        const roleName = role ? role.toString() : "team";
        if (linkOfPost) {
            const messagesArray = [
                `${roleName}, just a quick heads up! It would be awesome if you could hop onto LinkedIn and give a like, share, and comment on our latest post. Here's our latest post: ${linkOfPost} It'll help us reach a wider audience. Thanks a bunch! 🚀`,
                `Hey ${roleName}, Show some love on LinkedIn by engaging with our latest post. Every like, share, and comment helps! Here's our latest post: ${linkOfPost}`,
                `Quick favor, ${roleName}! Could you support our LinkedIn efforts by liking, sharing, and commenting on our recent post? Here's our latest post: ${linkOfPost}`,
                `Hi ${roleName}, we could use your help in spreading the word on LinkedIn. Please give our latest post a thumbs up, share, and drop a comment if you can! Here's our latest post: ${linkOfPost}`,
                `${roleName}, let's give our LinkedIn post a little boost! Can you all like, share, and comment to help increase its visibility? Here's our latest post: ${linkOfPost}`,
                `Hey ${roleName}, hoping you can lend a hand in amplifying our LinkedIn presence. Please engage with our recent post by liking, sharing, and commenting! Here's our latest post: ${linkOfPost}`,
                `Quick request, ${roleName}! Could you take a moment to engage with our LinkedIn post? Likes, shares, and comments all appreciated! Here's our latest post: ${linkOfPost}`,
                `Hey there, ${roleName}! Looking to increase our LinkedIn reach. Could you support by liking, sharing, and commenting on our latest post? Here's our latest post: ${linkOfPost}`,
                `${roleName}, let's work together to boost our LinkedIn visibility! Please engage with our recent post by liking, sharing, and commenting. Here's our latest post: ${linkOfPost}`,
                `Hi ${roleName}, aiming to make a bigger impact on LinkedIn. Would you mind giving our recent post some love with likes, shares, and comments? Here's our latest post: ${linkOfPost}`,
            ];

            const random = Math.floor(Math.random() * 11);

            interaction.reply({
                content: messagesArray[random],
                ephemeral: false,
            });
        } else {
            interaction.reply("Unable to answer the query");
        }
    }
});

client.on("ready", async () => {
    registerCommand();
});
client.login(process.env.BOT_TOKEN);
