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
app.use(express.json());

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;
const GUILD_ID = process.env.GUILD_ID;

const RAPPORTS_CHANNEL_ID = "1512994911388172288";
const VALIDES_CHANNEL_ID = "1515754593810649118";
const PARTENAIRE_ROLE_ID = "1515065793790873761";

// ⚠️ Mets l'ID du rôle staff dans Railway > Variables : STAFF_ROLE_ID
const STAFF_ROLE_ID = process.env.STAFF_ROLE_ID || "";

const SITE_URL = "https://rockstar-france.gamer.free";
const INVITE_URL = "https://discord.gg/D4JpNnFnvT";
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

function getFieldValue(embed, text, fallback = "Non renseigné") {
  return getField(embed, text)?.value || fallback;
}

function extractDiscordId(value) {
  if (!value) return null;
  const clean = String(value).replace(/\D/g, "");
  return clean.length >= 17 ? clean : null;
}

function buildDisabledRow(label, style, customId) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(style)
      .setDisabled(true)
  );
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

  if (!code) return res.send("Erreur : aucun code Discord reçu.");

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
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenResponse.data.access_token;

    const userResponse = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const guildsResponse = await axios.get(
      "https://discord.com/api/users/@me/guilds",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const user = userResponse.data;
    const guilds = guildsResponse.data;

    const isMember = guilds.some((guild) => guild.id === GUILD_ID);

    if (!isMember) {
      return res.send(`
        <h1>Accès refusé</h1>
        <p>Tu dois rejoindre le serveur Rockstar France avant de postuler.</p>
        <a href="${INVITE_URL}">Rejoindre le serveur</a>
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
      `#staff`;

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

  const customId = interaction.customId;

  const isPartnershipButton =
    customId === "accepter_partenaire" ||
    customId === "refuser_partenaire";

  const isStaffButton =
    customId.startsWith("staff_accept_") ||
    customId.startsWith("staff_refuse_") ||
    customId.startsWith("staff_interview_");

  if (!isPartnershipButton && !isStaffButton) return;

  await interaction.deferReply({ ephemeral: true });

  try {
    const message = interaction.message;
    const oldEmbed = message.embeds[0];

    if (!oldEmbed) return interaction.editReply("❌ Aucun embed trouvé.");

    const alreadyProcessed =
      oldEmbed.title?.includes("accepté") ||
      oldEmbed.title?.includes("refusé") ||
      oldEmbed.title?.includes("entretien") ||
      oldEmbed.fields?.some((field) =>
        field.name.toLowerCase().includes("statut")
      );

    if (alreadyProcessed) {
      return interaction.editReply("⚠️ Cette demande a déjà été traitée.");
    }

    const rapportsChannel = await client.channels.fetch(RAPPORTS_CHANNEL_ID);
    const validesChannel = await client.channels.fetch(VALIDES_CHANNEL_ID);

    /* =========================
       PARTENARIATS
    ========================= */

    if (isPartnershipButton) {
      const pseudo = getFieldValue(oldEmbed, "pseudo");
      const lien = getFieldValue(oldEmbed, "lien", "Aucun lien");
      const membres = getFieldValue(oldEmbed, "membres");
      const viewers = getFieldValue(oldEmbed, "viewers");
      const discordId = extractDiscordId(getFieldValue(oldEmbed, "id discord", ""));

      let member = null;

      if (discordId) {
        try {
          member = await interaction.guild.members.fetch(discordId);
        } catch {
          member = null;
        }
      }

      if (customId === "accepter_partenaire") {
        if (member) {
          try {
            await member.roles.add(PARTENAIRE_ROLE_ID);
          } catch (error) {
            console.log("Impossible d'ajouter le rôle partenaire :", error.message);
          }

          try {
            await member.send(
              "✅ **Partenariat accepté — Rockstar France**\n\n" +
              "Votre demande de partenariat a été acceptée.\n" +
              "Le rôle **Partenaire** vous a été ajouté sur le serveur.\n\n" +
              `🔗 Serveur : ${INVITE_URL}`
            );
          } catch {
            console.log("MP partenaire impossible.");
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

        await message.edit({
          embeds: [acceptedEmbed],
          components: [
            buildDisabledRow("✅ Partenariat accepté", ButtonStyle.Success, "partenaire_accepte")
          ]
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

      if (customId === "refuser_partenaire") {
        if (member) {
          try {
            await member.send(
              "❌ **Partenariat refusé — Rockstar France**\n\n" +
              "Votre demande de partenariat a été refusée pour le moment.\n" +
              "Vous pouvez refaire une demande plus tard avec un projet plus complet."
            );
          } catch {
            console.log("MP refus partenaire impossible.");
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

        await message.edit({
          embeds: [refusedEmbed],
          components: [
            buildDisabledRow("❌ Partenariat refusé", ButtonStyle.Danger, "partenaire_refuse")
          ]
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
    }

    /* =========================
       CANDIDATURES STAFF
    ========================= */

    if (isStaffButton) {
      const discordId =
        extractDiscordId(customId) ||
        extractDiscordId(getFieldValue(oldEmbed, "id discord", ""));

      const pseudo = getFieldValue(oldEmbed, "pseudo");
      const age = getFieldValue(oldEmbed, "âge");
      const plateforme = getFieldValue(oldEmbed, "plateforme");
      const poste = getFieldValue(oldEmbed, "poste");
      const motivation = getFieldValue(oldEmbed, "motivation");

      let member = null;

      if (discordId) {
        try {
          member = await interaction.guild.members.fetch(discordId);
        } catch {
          member = null;
        }
      }

      if (customId.startsWith("staff_accept_")) {
        let roleAdded = false;

        if (member && STAFF_ROLE_ID) {
          try {
            await member.roles.add(STAFF_ROLE_ID);
            roleAdded = true;
          } catch (error) {
            console.log("Impossible d'ajouter le rôle staff :", error.message);
          }
        }

        if (member) {
          try {
            await member.send(
              "✅ **Candidature staff acceptée — Rockstar France**\n\n" +
              "Votre candidature staff a été acceptée.\n" +
              "Un membre de l'équipe va vous contacter prochainement.\n\n" +
              `🛡️ Poste : ${poste}\n` +
              `🎮 Plateforme : ${plateforme}\n\n` +
              `🔗 Serveur : ${INVITE_URL}`
            );
          } catch {
            console.log("MP acceptation staff impossible.");
          }
        }

        const acceptedEmbed = EmbedBuilder.from(oldEmbed)
          .setTitle("✅ Candidature staff acceptée")
          .setColor(0x22c55e)
          .addFields({
            name: "✅ Statut",
            value: `Acceptée par ${interaction.user}`,
            inline: false
          });

        await message.edit({
          embeds: [acceptedEmbed],
          components: [
            buildDisabledRow("✅ Candidature acceptée", ButtonStyle.Success, "staff_done_accept")
          ]
        });

        await rapportsChannel.send({
          content:
            "✅ **Candidature staff acceptée**\n" +
            `👤 Candidat : ${pseudo}\n` +
            `🆔 ID Discord : ${discordId || "Non renseigné"}\n` +
            `🎂 Âge : ${age}\n` +
            `🎮 Plateforme : ${plateforme}\n` +
            `🛡️ Poste : ${poste}\n` +
            `🎭 Rôle staff ajouté : ${roleAdded ? "Oui" : "Non"}\n` +
            `👮 Traité par : ${interaction.user}`
        });

        return interaction.editReply("✅ Candidature acceptée.");
      }

      if (customId.startsWith("staff_refuse_")) {
        if (member) {
          try {
            await member.send(
              "❌ **Candidature staff refusée — Rockstar France**\n\n" +
              "Votre candidature staff a été refusée pour le moment.\n" +
              "Vous pourrez retenter plus tard avec une candidature plus complète.\n\n" +
              `🔗 Serveur : ${INVITE_URL}`
            );
          } catch {
            console.log("MP refus staff impossible.");
          }
        }

        const refusedEmbed = EmbedBuilder.from(oldEmbed)
          .setTitle("❌ Candidature staff refusée")
          .setColor(0xef4444)
          .addFields({
            name: "❌ Statut",
            value: `Refusée par ${interaction.user}`,
            inline: false
          });

        await message.edit({
          embeds: [refusedEmbed],
          components: [
            buildDisabledRow("❌ Candidature refusée", ButtonStyle.Danger, "staff_done_refuse")
          ]
        });

        await rapportsChannel.send({
          content:
            "❌ **Candidature staff refusée**\n" +
            `👤 Candidat : ${pseudo}\n` +
            `🆔 ID Discord : ${discordId || "Non renseigné"}\n` +
            `🎂 Âge : ${age}\n` +
            `🎮 Plateforme : ${plateforme}\n` +
            `🛡️ Poste : ${poste}\n` +
            `👮 Traité par : ${interaction.user}`
        });

        return interaction.editReply("❌ Candidature refusée.");
      }

      if (customId.startsWith("staff_interview_")) {
        if (member) {
          try {
            await member.send(
              "📅 **Entretien staff — Rockstar France**\n\n" +
              "Votre candidature a été retenue pour un entretien.\n" +
              "Un membre du staff va vous contacter pour organiser la suite.\n\n" +
              `🛡️ Poste demandé : ${poste}\n` +
              `🎮 Plateforme : ${plateforme}\n\n` +
              `🔗 Serveur : ${INVITE_URL}`
            );
          } catch {
            console.log("MP entretien staff impossible.");
          }
        }

        const interviewEmbed = EmbedBuilder.from(oldEmbed)
          .setTitle("📅 Candidature staff — entretien demandé")
          .setColor(0x5865f2)
          .addFields({
            name: "📅 Statut",
            value: `Entretien demandé par ${interaction.user}`,
            inline: false
          });

        await message.edit({
          embeds: [interviewEmbed],
          components: [
            buildDisabledRow("📅 Entretien demandé", ButtonStyle.Primary, "staff_done_interview")
          ]
        });

        await rapportsChannel.send({
          content:
            "📅 **Entretien demandé pour candidature staff**\n" +
            `👤 Candidat : ${pseudo}\n` +
            `🆔 ID Discord : ${discordId || "Non renseigné"}\n` +
            `🎂 Âge : ${age}\n` +
            `🎮 Plateforme : ${plateforme}\n` +
            `🛡️ Poste : ${poste}\n` +
            `👮 Traité par : ${interaction.user}`
        });

        return interaction.editReply("📅 Entretien demandé.");
      }
    }
  } catch (error) {
    console.error("Erreur interaction :", error);
    return interaction.editReply("❌ Erreur pendant le traitement.");
  }
});

/* =========================
   LANCEMENT
========================= */
app.post("/staff-candidature", async (req, res) => {
  try {
    console.log("📩 Données reçues staff :", req.body);

    const data = req.body || {};

    const discord_id = data.discord_id || data.discordId || "";
    const discord_username = data.discord_username || "";
    const discord_global_name = data.discord_global_name || "";
    const pseudo =
      data.pseudo ||
      discord_global_name ||
      discord_username ||
      "Inconnu";

    const age = data.age || "Non renseigné";
    const plateforme = data.plateforme || "Non renseignée";
    const poste = data.poste || "Non renseigné";
    const motivation = data.motivation || "Non renseignée";

    const recrutementChannel = await client.channels.fetch("1515826299091030169");

    const embed = new EmbedBuilder()
      .setTitle("📋 Nouvelle candidature staff")
      .setColor(0xfacc15)
      .addFields(
        { name: "👤 Pseudo Discord", value: String(pseudo), inline: false },
        { name: "🆔 ID Discord", value: String(discord_id || "Inconnu"), inline: false },
        { name: "🎂 Âge", value: String(age), inline: false },
        { name: "🎮 Plateforme", value: String(plateforme), inline: false },
        { name: "🛡️ Poste souhaité", value: String(poste), inline: false },
        { name: "⭐ Motivation", value: String(motivation), inline: false }
      )
      .setFooter({ text: "Rockstar France • Recrutement staff automatique" })
      .setTimestamp();

    const safeDiscordId = discord_id || "noid";

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`staff_accept_${safeDiscordId}`)
        .setLabel("Accepter")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`staff_refuse_${safeDiscordId}`)
        .setLabel("Refuser")
        .setStyle(ButtonStyle.Danger),

      new ButtonBuilder()
        .setCustomId(`staff_interview_${safeDiscordId}`)
        .setLabel("Entretien")
        .setStyle(ButtonStyle.Primary)
    );

    await recrutementChannel.send({
      content: "@here 📋 Nouvelle candidature staff",
      embeds: [embed],
      components: [buttons]
    });

    return res.json({ success: true });

  } catch (error) {
    console.error("❌ Erreur /staff-candidature :", error);
    return res.status(500).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`🌐 Serveur OAuth lancé sur le port ${PORT}`);
});

client.login(TOKEN);
