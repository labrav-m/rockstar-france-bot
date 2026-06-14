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
  if (!message.author.bot) return;
  if (!message.embeds.length) return;

  const embed = message.embeds[0];

  if (!embed.title || !embed.title.includes("Nouvelle demande de partenariat")) return;

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

  const linkButtons = message.components.length > 0 ? message.components : [];

 await message.channel.send({
  content: "📋 **Demande à traiter par le staff :**",
  embeds: [embed],
  components: [...linkButtons, staffButtons]
});

try {
  await message.delete();
  console.log("🧹 Message Make supprimé après repost.");
} catch (error) {
  console.log("Impossible de supprimer le message Make :", error.message);
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) return;

  const message = interaction.message;
  const oldEmbed = message.embeds[0];
  if (
  oldEmbed.title?.includes("Partenariat accepté") ||
  oldEmbed.title?.includes("Partenariat refusé")
) {
  return interaction.reply({
    content: "⚠️ Cette demande a déjà été traitée.",
    ephemeral: true
  });
}

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
  const discordIdField = fields.find(f => f.name.includes("ID Discord"));
  const membresField = fields.find(f => f.name.includes("Membres"));
  const viewersField = fields.find(f => f.name.includes("Viewers"));

  const pseudo = pseudoField?.value || "Non renseigné";
  const lien = lienField?.value || "Aucun lien";
  const discordIdField = fields.find(f => f.name.includes("ID Discord"));
  const discordId = discordIdField?.value?.replace(/\D/g, "") || null;
  const membres = membresField?.value || "Non renseigné";
  const viewers = viewersField?.value || "Non renseigné";

  if (interaction.customId === "accepter_partenaire") {
    await interaction.deferReply({ ephemeral: true });
    let member = null;

if (discordId) {
  try {
    member = await interaction.guild.members.fetch(discordId);
    await member.roles.add(PARTENAIRE_ROLE_ID);
  } catch (error) {
    console.log("Impossible d'ajouter le rôle partenaire :", error.message);
  }
}
    if (member) {
  try {
    await member.send(
      `✅ **Partenariat accepté — Rockstar France**\n\n` +
      `Bonjour,\n\n` +
      `Votre demande de partenariat avec **Rockstar France** a été acceptée.\n\n` +
      `Vous avez reçu le rôle **Partenaire** sur le serveur.\n\n` +
      `Merci de respecter les conditions du partenariat et de rester disponible si le staff vous contacte.\n\n` +
      `🔗 Serveur Discord : https://discord.gg/D4JpNnFnvT`
    );
  } catch (error) {
    console.log("Impossible d'envoyer le message privé d'acceptation :", error.message);
  }
}
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
        `🆔 ID Discord : ${discordId || "Non renseigné"}\n` +
        `🎭 Rôle ajouté : ${member ? "Oui" : "Non"}\n` +
        `👥 Membres : ${membres}\n` +
        `🎥 Viewers moyens : ${viewers}\n` +
        `🔗 Lien : ${lien}\n` +
        `👮 Staff : ${interaction.user}`
    });

    await interaction.editReply({
  content: "✅ Partenariat accepté et enregistré."
});

  if (interaction.customId === "refuser_partenaire") {
    await interaction.deferReply({ ephemeral: true });
    let member = null;

if (discordId) {
  try {
    member = await interaction.guild.members.fetch(discordId);
  } catch (error) {
    console.log("Impossible de trouver le membre pour le DM de refus :", error.message);
  }
}

if (member) {
  try {
    await member.send(
      `❌ **Partenariat refusé — Rockstar France**\n\n` +
      `Bonjour,\n\n` +
      `Votre demande de partenariat avec **Rockstar France** a été refusée pour le moment.\n\n` +
      `Vous pouvez refaire une demande plus tard si votre projet évolue ou si vous souhaitez proposer une collaboration plus adaptée.\n\n` +
      `Merci pour votre intérêt envers la communauté **Rockstar France**.\n\n` +
      `🔗 Serveur Discord : https://discord.gg/D4JpNnFnvT`
    );
  } catch (error) {
    console.log("Impossible d'envoyer le message privé de refus :", error.message);
  }
}
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

    await interaction.editReply({
  content: "❌ Partenariat refusé et enregistré."
});
  }
});

client.login(TOKEN);
