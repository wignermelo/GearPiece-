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
      },
      tripulacao: {
        slots: [null, null, null, null, null],
        formacao: "2-1-2"
      }
    };
  }
}

// ================= CARTAS (COM STATS) =================
const cartas = {
  Comum: [
    { nome: "Nami Base", atk: 10, def: 10, hp: 50, over: 10, classe: "Suporte" },
    { nome: "Usopp Base", atk: 12, def: 8, hp: 45, over: 10, classe: "Físico" }
  ],
  Raro: [
    { nome: "Zoro Base", atk: 30, def: 20, hp: 120, over: 25, classe: "Físico" },
    { nome: "Sanji Base", atk: 28, def: 18, hp: 110, over: 25, classe: "Físico" }
  ],
  Epico: [
    { nome: "Zoro Enma", atk: 80, def: 50, hp: 300, over: 60, classe: "Físico" },
    { nome: "Law", atk: 70, def: 40, hp: 280, over: 58, classe: "Mágico" }
  ],
  Lendario: [
    { nome: "Shanks", atk: 120, def: 90, hp: 500, over: 85, classe: "Físico" },
    { nome: "Mihawk", atk: 130, def: 80, hp: 480, over: 88, classe: "Físico" }
  ],
  Mitico: [
    { nome: "Luffy Gear 5", atk: 200, def: 150, hp: 800, over: 100, classe: "Mágico" }
  ]
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

// ================= UTIL =================
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
  const list = cartas[rar];
  return list[Math.floor(Math.random() * list.length)];
}

// ================= PACKS =================
const packs = {
  recruta: 1000,
  shichibukai: 5000,
  almirante: 10000,
  yonkou: 20000,
  rei: 40000
};

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

    db[id].cartas.push(carta);

    salvarDB(db);

    const embed = new EmbedBuilder()
      .setTitle(carta.nome)
      .setDescription(`ATK: ${carta.atk} | DEF: ${carta.def} | HP: ${carta.hp} | OVER: ${carta.over}`)
      .setColor("#2b2d31");

    return msg.reply({ embeds: [embed] });
  }

  // 💰 CARTEIRA
  if (msg.content === "!carteira") {
    return msg.reply(`💰 ${db[id].dinheiro} GC`);
  }

  // 📦 PACOTE
  if (msg.content === "!pacote") {
    const user = db[id];

    const options = Object.keys(user.pacotes)
      .filter(p => user.pacotes[p] > 0)
      .map(p => ({ label: `${p} (${user.pacotes[p]})`, value: p }));

    if (!options.length) return msg.reply("Sem pacotes.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`open|${id}`)
      .setPlaceholder("Abrir pacote")
      .addOptions(options);

    return msg.reply({
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // 📜 COLEÇÃO
  if (msg.content === "!colecao") {
    if (!db[id].cartas.length)
      return msg.reply("Sem cartas.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`view|${id}`)
      .setPlaceholder("Ver carta")
      .addOptions(
        db[id].cartas.map((c, i) => ({
          label: c.nome,
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
      .setCustomId(`sell|${id}`)
      .setPlaceholder("Vender carta")
      .addOptions(
        db[id].cartas.map((c, i) => ({
          label: c.nome,
          value: String(i)
        }))
      );

    return msg.reply({
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // ⚔️ TRIPULAÇÃO
  if (msg.content === "!tripulacao") {
    return msg.reply("Sistema de tripulação ativo (slots + formação pronto)");
  }
});

// ================= BATALHA =================
client.on("interactionCreate", async (i) => {
  try {
    const db = carregarDB();
    const [type, id, ...args] = i.customId.split("|");

    if (i.user.id !== id) return;

    garantirUser(db, id);

    if (i.isStringSelectMenu()) {

      if (type === "sell") {
        const index = i.values[0];
        const carta = db[id].cartas[index];

        db[id].dinheiro += 500;
        db[id].cartas.splice(index, 1);

        salvarDB(db);

        return i.update({ content: `Vendeu ${carta.nome}`, components: [] });
      }

      if (type === "view") {
        return i.update({
          content: db[id].cartas[i.values[0]].nome,
          components: []
        });
      }
    }

  } catch (e) {
    console.log(e);
    if (!i.replied) i.reply({ content: "Erro", ephemeral: true });
  }
});

client.login(process.env.TOKEN);
