const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const TOKEN = process.env.DISCORD_TOKEN;

const DEMANDES_CHANNEL_ID = "1515754593810649118"; // à modifier si besoin
const RAPPORTS_CHANNEL_ID = "1512994911388172288";
const VALIDES_CHANNEL_ID = "1515754593810649118";
const PARTENAIRE_ROLE_ID = "1515065793790873761";

client.once("ready", () => {
  console.log(`✅ Rockstar France Bot connecté : ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot === false) return;
  if (!message.embeds.length) return;

  const embed = message.embeds[0];

  if (!embed.title || !embed.title.includes("Nouvelle demande de partenariat")) return;

const oldComponents = message.components || [];

const staffButtons = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("accepter_partenaire")
    .setLabel("✅ Accepter")
    .setStyle(ButtonStyle.Success),

  new ButtonBuilder()
    .setCustomId("refuser_partenaire")
    .setLabel("❌ Refuser")
    .setStyle(ButtonStyle.Danger)
);

await message.edit({
  components: [...oldComponents, staffButtons]
});

  console.log("✅ Boutons ajoutés sur une nouvelle demande.");
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const message = interaction.message;
  const oldEmbed = message.embeds[0];

  if (!oldEmbed) {
    return interaction.reply({
      content: "❌ Aucun embed trouvé sur cette demande.",
      ephemeral: true
    });
  }

  const rapportsChannel = await client.channels.fetch(RAPPORTS_CHANNEL_ID);
  const validesChannel = await client.channels.fetch(VALIDES_CHANNEL_ID);

  const fields = oldEmbed.fields || [];

  const pseudoField = fields.find(f => f.name.includes("Pseudo"));
  const lienField = fields.find(f => f.name.includes("Lien"));
  const membresField = fields.find(f => f.name.includes("Membres"));
  const viewersField = fields.find(f => f.name.includes("Viewers"));

  const pseudo = pseudoField?.value || "Non renseigné";
  const lien = lienField?.value || "Aucun lien";
  const membres = membresField?.value || "Non renseigné";
  const viewers = viewersField?.value || "Non renseigné";

  if (interaction.customId === "accepter_partenaire") {
    const acceptedEmbed = EmbedBuilder.from(oldEmbed)
      .setTitle("✅ Partenariat accepté")
      .setColor(0x22c55e)
      .addFields({
        name: "✅ Statut",
        value: `Accepté par ${interaction.user}`,
        inline: false
      });

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("partenaire_accepte")
        .setLabel("✅ Partenariat accepté")
        .setStyle(ButtonStyle.Success)
        .setDisabled(true)
    );

    await message.edit({
      embeds: [acceptedEmbed],
      components: [disabledRow]
    });

    await validesChannel.send({
      content: `✅ Nouveau partenariat validé par ${interaction.user}`,
      embeds: [acceptedEmbed]
    });

    await rapportsChannel.send({
      content:
        `✅ **Partenariat accepté**\n` +
        `👤 Responsable : ${pseudo}\n` +
        `👥 Membres : ${membres}\n` +
        `🎥 Viewers moyens : ${viewers}\n` +
        `🔗 Lien : ${lien}\n` +
        `👮 Staff : ${interaction.user}`
    });

    await interaction.reply({
      content: "✅ Partenariat accepté et enregistré.",
      ephemeral: true
    });
  }

  if (interaction.customId === "refuser_partenaire") {
    const refusedEmbed = EmbedBuilder.from(oldEmbed)
      .setTitle("❌ Partenariat refusé")
      .setColor(0xef4444)
      .addFields({
        name: "❌ Statut",
        value: `Refusé par ${interaction.user}`,
        inline: false
      });

    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("partenaire_refuse")
        .setLabel("❌ Partenariat refusé")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(true)
    );

    await message.edit({
      embeds: [refusedEmbed],
      components: [disabledRow]
    });

    await rapportsChannel.send({
      content:
        `❌ **Partenariat refusé**\n` +
        `👤 Responsable : ${pseudo}\n` +
        `👥 Membres : ${membres}\n` +
        `🎥 Viewers moyens : ${viewers}\n` +
        `🔗 Lien : ${lien}\n` +
        `👮 Staff : ${interaction.user}`
    });

    await interaction.reply({
      content: "❌ Partenariat refusé et enregistré.",
      ephemeral: true
    });
  }
});

client.login(TOKEN);
