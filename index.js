const express = require("express");
const axios = require("axios");

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

const app = express();

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const GUILD_ID = process.env.GUILD_ID;

const RAPPORTS_CHANNEL_ID = "1512994911388172288";
const VALIDES_CHANNEL_ID = "1515754593810649118";
const PARTENAIRE_ROLE_ID = "1515065793790873761";

const SITE_URL = "https://rockstar-france.gamer.free";
const PORT = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

function getField(embed, text) {
  return embed.fields?.find((f) =>
    f.name.toLowerCase().includes(text.toLowerCase())
  );
}

function extractDiscordId(value) {
  if (!value) return null;
  const clean = String(value).replace(/\D/g, "");
  return clean.length >= 17 ? clean : null;
}

/* =========================
   OAUTH DISCORD
========================= */

app.get("/", (req, res) => {
  res.send("Rockstar France Bot en ligne.");
});

app.get("/login", (req, res) => {
  const url =
    "https://discord.com/oauth2/authorize" +
    `?client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
    "&response_type=code" +
    "&scope=identify%20guilds";

  return res.redirect(url);
});

app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.send("Erreur : aucun code Discord reçu.");
  }

  try {
    const tokenResponse = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        }
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const guildsResponse = await axios.get(
      "https://discord.com/api/users/@me/guilds",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );

    const user = userResponse.data;
    const guilds = guildsResponse.data;

    const isMember = guilds.some((guild) => guild.id === GUILD_ID);

    if (!isMember) {
      return res.send(`
        <h1>Accès refusé</h1>
        <p>Tu dois rejoindre le serveur Rockstar France avant de postuler.</p>
        <a href="https://discord.gg/D4JpNnFnvT">Rejoindre le serveur</a>
      `);
    }

    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
      : "";

    const finalUrl =
      `${SITE_URL}/?verified=true` +
      `&discord_id=${encodeURIComponent(user.id)}` +
      `&discord_username=${encodeURIComponent(user.username)}` +
      `&discord_global_name=${encodeURIComponent(user.global_name || user.username)}` +
      `&discord_avatar=${encodeURIComponent(avatarUrl)}` +
      `#collaboration`;

    return res.redirect(finalUrl);
  } catch (error) {
    console.error("Erreur OAuth :", error.response?.data || error.message);
    return res.send("Erreur pendant la vérification Discord.");
  }
});

/* =========================
   BOT DISCORD
========================= */

client.once(Events.ClientReady, () => {
  console.log(`✅ Rockstar France Bot connecté : ${client.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  if (
    interaction.customId !== "accepter_partenaire" &&
    interaction.customId !== "refuser_partenaire"
  ) {
    return;
  }

  await interaction.deferReply({ ephemeral: true });

  try {
    const message = interaction.message;
    const oldEmbed = message.embeds[0];

    if (!oldEmbed) {
      return interaction.editReply("❌ Aucun embed trouvé.");
    }

    const alreadyProcessed = oldEmbed.fields?.some((field) =>
      field.name.toLowerCase().includes("statut")
    );

    if (alreadyProcessed) {
      return interaction.editReply("⚠️ Cette demande a déjà été traitée.");
    }

    const rapportsChannel = await client.channels.fetch(RAPPORTS_CHANNEL_ID);
    const validesChannel = await client.channels.fetch(VALIDES_CHANNEL_ID);

    const pseudo = getField(oldEmbed, "pseudo")?.value || "Non renseigné";
    const lien = getField(oldEmbed, "lien")?.value || "Aucun lien";
    const membres = getField(oldEmbed, "membres")?.value || "Non renseigné";
    const viewers = getField(oldEmbed, "viewers")?.value || "Non renseigné";
    const discordIdValue = getField(oldEmbed, "id discord")?.value;
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
          console.log("Impossible d'ajouter le rôle :", error.message);
        }

        try {
          await member.send(
            "✅ **Partenariat accepté — Rockstar France**\n\n" +
              "Votre demande de partenariat a été acceptée.\n" +
              "Le rôle **Partenaire** vous a été ajouté sur le serveur.\n\n" +
              "Merci de respecter les conditions du partenariat."
          );
        } catch {
          console.log("MP impossible à envoyer.");
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
        content: "📋 **Demande à traiter par le staff :**",
        embeds: [acceptedEmbed],
        components: [disabledRow]
      });

      await validesChannel.send({
        content: `✅ Nouveau partenariat validé par ${interaction.user}`,
        embeds: [acceptedEmbed]
      });

      await rapportsChannel.send({
        content:
          "✅ **Partenariat accepté**\n" +
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
            "❌ **Partenariat refusé — Rockstar France**\n\n" +
              "Votre demande de partenariat a été refusée.\n" +
              "Vous pouvez retenter plus tard avec une demande plus complète."
          );
        } catch {
          console.log("MP impossible à envoyer.");
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
        content: "📋 **Demande à traiter par le staff :**",
        embeds: [refusedEmbed],
        components: [disabledRow]
      });

      await rapportsChannel.send({
        content:
          "❌ **Partenariat refusé**\n" +
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
    console.error("Erreur interaction :", error);
    return interaction.editReply("❌ Erreur pendant le traitement.");
  }
});

/* =========================
   LANCEMENT
========================= */

app.listen(PORT, () => {
  console.log(`🌐 Serveur OAuth lancé sur le port ${PORT}`);
});

client.login(TOKEN);
