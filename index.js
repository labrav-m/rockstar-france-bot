const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
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

const RAPPORTS_CHANNEL_ID = "1512994911388172288";
const VALIDES_CHANNEL_ID = "1515754593810649118";
const PARTENAIRE_ROLE_ID = "1515065793790873761";

client.once(Events.ClientReady, () => {
  console.log(`✅ Rockstar France Bot connecté : ${client.user.tag}`);
});

function getField(embed, text) {
  return embed.fields?.find(f =>
    f.name.toLowerCase().includes(text.toLowerCase())
  );
}

function extractDiscordId(value) {
  if (!value) return null;
  const clean = value.replace(/\D/g, "");
  return clean.length >= 17 ? clean : null;
}

client.on(Events.MessageCreate, async (message) => {
  try {
    if (!message.author.bot) return;
    if (message.author.id === client.user.id) return;
    if (!message.embeds.length) return;

    const embed = message.embeds[0];

    if (!embed.title?.includes("Nouvelle demande de partenariat")) return;

    const linkButtons = message.components || [];

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

    await message.channel.send({
      content: "📋 **Demande à traiter par le staff :**",
      embeds: [embed],
      components: [...linkButtons, staffButtons]
    });

    await message.delete().catch(() => {});
  } catch (error) {
    console.error("Erreur messageCreate :", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  try {
    const message = interaction.message;
    const oldEmbed = message.embeds[0];

    if (!oldEmbed) {
      return interaction.reply({
        content: "❌ Aucun embed trouvé.",
        ephemeral: true
      });
    }

    if (
      oldEmbed.title?.includes("Partenariat accepté") ||
      oldEmbed.title?.includes("Partenariat refusé")
    ) {
      return interaction.reply({
        content: "⚠️ Cette demande a déjà été traitée.",
        ephemeral: true
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const rapportsChannel = await client.channels.fetch(RAPPORTS_CHANNEL_ID);
    const validesChannel = await client.channels.fetch(VALIDES_CHANNEL_ID);

    const pseudo = getField(oldEmbed, "Pseudo")?.value || "Non renseigné";
    const lien = getField(oldEmbed, "Lien")?.value || "Aucun lien";
    const membres = getField(oldEmbed, "Membres")?.value || "Non renseigné";
    const viewers = getField(oldEmbed, "Viewers")?.value || "Non renseigné";

    const discordIdValue = getField(oldEmbed, "ID Discord")?.value;
    const discordId = extractDiscordId(discordIdValue);

    let member = null;

    if (discordId) {
      try {
        member = await interaction.guild.members.fetch(discordId);
      } catch {
        member = null;
      }
    }

    if (interaction.customId === "accepter_partenaire") {
      if (member) {
        try {
          await member.roles.add(PARTENAIRE_ROLE_ID);
        } catch (error) {
          console.log("Impossible d'ajouter le rôle partenaire :", error.message);
        }

        try {
          await member.send(
            `✅ **Partenariat accepté — Rockstar France**\n\n` +
            `Votre demande de partenariat a été acceptée.\n\n` +
            `Vous avez reçu le rôle **Partenaire** sur le serveur.\n\n` +
            `Merci de respecter les conditions du partenariat.\n\n` +
            `🔗 Serveur Discord : https://discord.gg/D4JpNnFnvT`
          );
        } catch {}
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

      return interaction.editReply("✅ Partenariat accepté et enregistré.");
    }

    if (interaction.customId === "refuser_partenaire") {
      if (member) {
        try {
          await member.send(
            `❌ **Partenariat refusé — Rockstar France**\n\n` +
            `Votre demande de partenariat a été refusée pour le moment.\n\n` +
            `Vous pouvez refaire une demande plus tard si votre projet évolue.\n\n` +
            `Merci pour votre intérêt envers Rockstar France.\n\n` +
            `🔗 Serveur Discord : https://discord.gg/D4JpNnFnvT`
          );
        } catch {}
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
          `🆔 ID Discord : ${discordId || "Non renseigné"}\n` +
          `👥 Membres : ${membres}\n` +
          `🎥 Viewers moyens : ${viewers}\n` +
          `🔗 Lien : ${lien}\n` +
          `👮 Staff : ${interaction.user}`
      });

      return interaction.editReply("❌ Partenariat refusé et enregistré.");
    }
  } catch (error) {
    console.error("Erreur interactionCreate :", error);

    if (interaction.deferred || interaction.replied) {
      await interaction.editReply("❌ Erreur pendant le traitement.");
    } else {
      await interaction.reply({
        content: "❌ Erreur pendant le traitement.",
        ephemeral: true
      });
    }
  }
});

client.login(TOKEN);
