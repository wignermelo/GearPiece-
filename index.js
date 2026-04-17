const { 
  Client, 
  GatewayIntentBits, 
  EmbedBuilder, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder
} = require('discord.js');

const fs = require('fs');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

// ================= DB =================
function carregarDB() {
  if (!fs.existsSync('./db.json')) fs.writeFileSync('./db.json', '{}');
  return JSON.parse(fs.readFileSync('./db.json'));
}

function salvarDB(db) {
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
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

function rolarRaridade() {
  const r = Math.random() * 100;
  let soma = 0;

  for (const t in chances) {
    soma += chances[t];
    if (r <= soma) return t;
  }
  return "Comum";
}

// ================= PACKS =================
const packs = {
  recruta: 1000,
  shichibukai: 5000,
  almirante: 10000,
  yonkou: 20000,
  rei: 40000
};

// ================= HELP =================
function pegarCarta(rar) {
  const list = cartas[rar];
  const nome = list[Math.floor(Math.random() * list.length)];
  return { nome, rar, valor: valores[rar] };
}

// ================= BOT =================
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
      .setDescription(`${carta.rar} - ${carta.valor} GC`)
      .setColor("#2b2d31");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`g|${id}|${carta.nome}|${carta.rar}`)
        .setLabel("Guardar")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`v|${id}|${carta.rar}`)
        .setLabel("Vender")
        .setStyle(ButtonStyle.Danger)
    );

    return msg.reply({ embeds: [embed], components: [row] });
  }

  // 🛒 LOJA
  if (msg.content === "!loja") {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`pack|${id}`)
      .setPlaceholder("Escolha um pacote")
      .addOptions(Object.keys(packs).map(p => ({
        label: p,
        value: p
      })));

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

  // 📜 COLEÇÃO (FIXADO)
  if (msg.content === "!colecao") {
    if (!db[id].cartas.length)
      return msg.reply("Você não tem cartas.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`view|${id}`)
      .setPlaceholder("Ver carta da coleção")
      .addOptions(
        db[id].cartas.map((c, i) => ({
          label: c,
          value: String(i)
        }))
      );

    return msg.reply({
      content: "📜 Sua coleção:",
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // 💰 VENDER (NOVO FIXADO)
  if (msg.content === "!vender") {
    if (!db[id].cartas.length)
      return msg.reply("Você não tem cartas para vender.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`sell|${id}`)
      .setPlaceholder("Selecione carta para vender")
      .addOptions(
        db[id].cartas.map((c, i) => ({
          label: c,
          value: String(i)
        }))
      );

    return msg.reply({
      content: "💰 Venda sua carta:",
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // 💰 CARTEIRA
  if (msg.content === "!carteira") {
    return msg.reply(`💰 Você tem ${db[id].dinheiro} GC`);
  }
});

// ================= INTERACTIONS =================
client.on("interactionCreate", async (i) => {
  try {
    if (!i.customId) return;

    const db = carregarDB();
    const parts = i.customId.split("|");

    const type = parts[0];
    const id = parts[1];

    garantirUser(db, id);

    if (i.user.id !== id)
      return i.reply({ content: "Isso não é pra você.", ephemeral: true });

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

      if (type === "sell") {
        const index = i.values[0];
        const carta = db[id].cartas[index];

        const rar = carta.match(/\((.*?)\)/)[1];

        db[id].dinheiro += valores[rar];
        db[id].cartas.splice(index, 1);

        salvarDB(db);

        return i.update({ content: `Vendeu ${carta}`, components: [] });
      }

      if (type === "view") {
        const carta = db[id].cartas[i.values[0]];

        return i.update({
          content: `📜 Carta: ${carta}`,
          components: []
        });
      }

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
                .setCustomId(`buy|${id}|${pack}`)
                .setLabel("Comprar")
                .setStyle(ButtonStyle.Success)
            )
          ]
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
