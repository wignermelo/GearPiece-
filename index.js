const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= DB =================
function carregarDB() {
  if (!fs.existsSync("./db.json")) fs.writeFileSync("./db.json", "{}");
  return JSON.parse(fs.readFileSync("./db.json"));
}

function salvarDB(db) {
  fs.writeFileSync("./db.json", JSON.stringify(db, null, 2));
}

function garantirUser(db, id) {
  if (!db[id]) {
    db[id] = {
      cartas: [],
      dinheiro: 5000,
      pacotes: {
        recruta: 0,
        shichibukai: 0,
        almirante: 0,
        yonkou: 0,
        rei: 0
      }
    };
  }
}

// ================= CARTAS =================
const cartas = {
  Comum: ["Nami Base","Usopp Base","Chopper Base","Franky Base","Brook Base"],
  Raro: ["Sanji Base","Robin Base","Zoro Base","Luffy Base","Ace Base"],
  Epico: ["Luffy Gear 2","Luffy Gear 3","Zoro Enma","Sanji Diable Jambe","Law","Kid"],
  Lendario: ["Luffy Gear 4","Shanks","Mihawk","Kaido","Big Mom","Akainu"],
  Mitico: ["Luffy Gear 5 Nika","Roger","Barba Branca Prime","Joy Boy","Imu"]
};

const valores = {
  Comum: 300,
  Raro: 1000,
  Epico: 4000,
  Lendario: 10000,
  Mitico: 30000
};

const chances = {
  Comum: 60,
  Raro: 30,
  Epico: 8,
  Lendario: 1.5,
  Mitico: 0.5
};

// ================= PACKS =================
const packs = {
  recruta: 1000,
  shichibukai: 5000,
  almirante: 10000,
  yonkou: 20000,
  rei: 40000
};

// ================= RARIDADE =================
function rolarRaridade() {
  const r = Math.random() * 100;
  let soma = 0;

  for (const t in chances) {
    soma += chances[t];
    if (r <= soma) return t;
  }
  return "Comum";
}

function pegarCarta(rar) {
  const lista = cartas[rar];
  const nome = lista[Math.floor(Math.random() * lista.length)];
  return { nome, rar, valor: valores[rar] };
}

// ================= READY =================
client.once("ready", () => console.log("Bot online!"));

// ================= MESSAGE =================
client.on("messageCreate", (msg) => {
  if (msg.author.bot) return;

  const db = carregarDB();
  const id = msg.author.id;
  garantirUser(db, id);

  // 🎴 RECRUTAR
  if (msg.content === "!recrutar") {
    const rar = rolarRaridade();
    const carta = pegarCarta(rar);

    const embed = new EmbedBuilder()
      .setTitle(carta.nome)
      .setDescription(`Raridade: ${carta.rar}\nValor: ${carta.valor}`)
      .setColor("#2b2d31");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`g:${id}:${carta.nome}:${carta.rar}`)
        .setLabel("Guardar")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`v:${id}:${carta.rar}`)
        .setLabel("Vender")
        .setStyle(ButtonStyle.Danger)
    );

    return msg.reply({ embeds: [embed], components: [row] });
  }

  // 🛒 LOJA
  if (msg.content === "!loja") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`pack:${id}`)
      .setPlaceholder("Escolha um pacote")
      .addOptions(
        Object.keys(packs).map(p => ({
          label: `${p} (${packs[p]} GC)`,
          value: p
        }))
      );

    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Loja de Pacotes")
          .setDescription("Escolha um pacote")
          .setColor("#2b2d31")
      ],
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // 📦 PACOTES
  if (msg.content === "!pacote") {
    const user = db[id];

    const options = Object.keys(user.pacotes)
      .filter(p => user.pacotes[p] > 0)
      .map(p => ({
        label: `${p} (${user.pacotes[p]})`,
        value: p
      }));

    if (!options.length) return msg.reply("Você não tem pacotes.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`open:${id}`)
      .setPlaceholder("Abrir pacote")
      .addOptions(options);

    return msg.reply({
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // 📜 COLEÇÃO
  if (msg.content === "!colecao") {
    if (!db[id].cartas.length)
      return msg.reply("Você não tem cartas.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`view:${id}`)
      .setPlaceholder("Ver carta")
      .addOptions(
        db[id].cartas.map((c, i) => ({
          label: c,
          value: String(i)
        }))
      );

    return msg.reply({
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // 💰 VENDER
  if (msg.content === "!vender") {
    if (!db[id].cartas.length)
      return msg.reply("Sem cartas.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`sell:${id}`)
      .setPlaceholder("Vender carta")
      .addOptions(
        db[id].cartas.map((c, i) => ({
          label: c,
          value: String(i)
        }))
      );

    return msg.reply({
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // 💰 CARTEIRA (FIX DEFINITIVO)
  if (msg.content === "!carteira") {
    return msg.reply(`💰 Você tem **${db[id].dinheiro} GC**`);
  }
});

// ================= INTERACTIONS (100% ESTÁVEL) =================
client.on("interactionCreate", async (i) => {
  try {
    if (!i.customId) return;

    const db = carregarDB();
    const parts = i.customId.split(":");
    const type = parts[0];
    const id = parts[1];

    if (!id || i.user.id !== id) {
      return i.reply({ content: "Essa interação não é sua.", ephemeral: true });
    }

    garantirUser(db, id);

    // ================= BUTTONS =================
    if (i.isButton()) {

      if (type === "g") {
        const nome = parts[2];
        const rar = parts[3];

        db[id].cartas.push(`${nome} (${rar})`);
        salvarDB(db);

        return i.update({ content: "Guardado!", components: [] });
      }

      if (type === "v") {
        const rar = parts[2];

        db[id].dinheiro += valores[rar];
        salvarDB(db);

        return i.update({ content: "Vendido!", components: [] });
      }

      if (type === "buy") {
        const pack = parts[2];

        if (db[id].dinheiro < packs[pack])
          return i.reply({ content: "Sem dinheiro.", ephemeral: true });

        db[id].dinheiro -= packs[pack];
        db[id].pacotes[pack]++;

        salvarDB(db);

        return i.update({ content: `Comprou ${pack}`, components: [] });
      }
    }

    // ================= SELECT =================
    if (i.isStringSelectMenu()) {

      if (type === "pack") {
        const pack = i.values[0];

        return i.update({
          embeds: [
            new EmbedBuilder()
              .setTitle(`Pacote: ${pack}`)
              .setDescription(`Preço: ${packs[pack]} GC`)
              .setColor("#2b2d31")
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`buy:${id}:${pack}`)
                .setLabel("Comprar")
                .setStyle(ButtonStyle.Success)
            )
          ]
        });
      }

      if (type === "sell") {
        const index = i.values[0];
        const carta = db[id].cartas[index];

        const rar = carta.match(/\((.*?)\)/)?.[1];
        if (!rar) return i.update({ content: "Erro na carta.", components: [] });

        db[id].dinheiro += valores[rar];
        db[id].cartas.splice(index, 1);

        salvarDB(db);

        return i.update({ content: `Vendeu ${carta}`, components: [] });
      }

      if (type === "view") {
        return i.update({
          content: db[id].cartas[i.values[0]],
          components: []
        });
      }

      if (type === "open") {
        const pack = i.values[0];

        if (db[id].pacotes[pack] <= 0)
          return i.reply({ content: "Sem pacotes.", ephemeral: true });

        db[id].pacotes[pack]--;

        const rar = rolarRaridade();
        const carta = pegarCarta(rar);

        db[id].cartas.push(`${carta.nome} (${carta.rar})`);

        salvarDB(db);

        return i.update({
          content: `Abriu ${pack} e ganhou ${carta.nome}`,
          components: []
        });
      }
    }

  } catch (err) {
    console.log("ERRO:", err);

    if (!i.replied) {
      return i.reply({ content: "Erro interno", ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
