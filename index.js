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
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

const TOKEN = process.env.DISCORD_TOKEN;

const RAPPORTS_CHANNEL_ID = "1512994911388172288";
const VALIDES_CHANNEL_ID = "1515754593810649118";
const PARTENAIRE_ROLE_ID = "1515065793790873761";

client.once("ready", () => {
  console.log(`✅ Rockstar France Bot connecté : ${client.user.tag}`);
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const staffName = interaction.user.tag;
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

  const pseudoField = fields.find(f => f.name.includes("Responsable"));
  const lienField = fields.find(f => f.name.includes("Lien"));

  const pseudo = pseudoField?.value || "Non renseigné";
  const lien = lienField?.value || "Aucun lien";
  const responsable = responsableField?.value || "Non renseigné";

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
      embeds: [acceptedEmbed],
      content: `✅ Nouveau partenariat validé par ${interaction.user}`
    });

    await rapportsChannel.send({
      content:
        `✅ **Partenariat accepté**\n` +
        `👤 Responsable : ${responsable}\n` +
        `🏷️ Communauté : ${pseudo}\n` +
        `🔗 Lien : ${lien}\n` +
        `👮 Staff : ${interaction.user}`
    });

    await interaction.reply({
      content: "✅ Partenariat accepté et envoyé dans le salon des partenariats validés.",
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
        `👤 Responsable : ${responsable}\n` +
        `🏷️ Communauté : ${pseudo}\n` +
        `🔗 Lien : ${lien}\n` +
        `👮 Staff : ${interaction.user}`
    });

    await interaction.reply({
      content: "❌ Partenariat refusé et enregistré dans les rapports.",
      ephemeral: true
    });
  }
});

client.login(TOKEN);
