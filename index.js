
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

// ================= USER =================
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
      tripulacao: [null, null, null, null, null],
      elo: 1000
    };
  }
}

// ================= CARTAS =================
const cartas = {
  Comum: [
    { nome: "Nami Base", atk: 10, def: 10, hp: 50, over: 10, classe: "Suporte" }
  ],
  Raro: [
    { nome: "Zoro Base", atk: 30, def: 20, hp: 120, over: 25, classe: "Físico" }
  ],
  Epico: [
    { nome: "Law", atk: 70, def: 40, hp: 280, over: 60, classe: "Mágico" }
  ],
  Lendario: [
    { nome: "Shanks", atk: 120, def: 90, hp: 500, over: 85, classe: "Físico" }
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

  const user = db[id];

  // 🎴 RECRUTAR
  if (msg.content === "!recrutar") {
    const rar = rolarRaridade();
    const carta = pegarCarta(rar);

    user.cartas.push(carta);
    salvarDB(db);

    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle(carta.nome)
          .setDescription(
            `ATK:${carta.atk} DEF:${carta.def} HP:${carta.hp} OVER:${carta.over}`
          )
          .setColor("#2b2d31")
      ]
    });
  }

  // 💰 CARTEIRA
  if (msg.content === "!carteira") {
    return msg.reply(`💰 ${user.dinheiro} GC`);
  }

  // 📦 PACOTES
  if (msg.content === "!pacote") {
    const options = Object.keys(user.pacotes)
      .filter(p => user.pacotes[p] > 0)
      .map(p => ({
        label: `${p} (${user.pacotes[p]})`,
        value: p
      }));

    if (!options.length) return msg.reply("Sem pacotes.");

    return msg.reply({
      components: [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`open|${id}`)
            .setPlaceholder("Abrir pacote")
            .addOptions(options)
        )
      ]
    });
  }

  // 📜 COLEÇÃO
  if (msg.content === "!colecao") {
    if (!user.cartas.length) return msg.reply("Sem cartas.");

    return msg.reply({
      components: [
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`view|${id}`)
            .setPlaceholder("Ver carta")
            .addOptions(
              user.cartas.map((c, i) => ({
                label: c.nome,
                value: String(i)
              }))
            )
        )
      ]
    });
  }

  // ⚔️ TRIPULAÇÃO
  if (msg.content === "!tripulacao") {
    return msg.reply(
      user.tripulacao.map((c, i) => `Slot ${i + 1}: ${c ? c.nome : "Vazio"}`).join("\n")
    );
  }

  // 🏆 ARENA
  if (msg.content === "!arena") {
    const ranking = Object.entries(db)
      .sort((a, b) => b[1].elo - a[1].elo)
      .slice(0, 10);

    return msg.reply(
      ranking.map((u, i) => `${i + 1}. <@${u[0]}> - ${u[1].elo} ELO`).join("\n")
    );
  }
});

// ================= PvP =================
client.on("messageCreate", (msg) => {
  if (!msg.content.startsWith("/desafiar")) return;

  const db = carregarDB();
  const id = msg.author.id;
  const alvo = msg.mentions.users.first();
  if (!alvo) return msg.reply("Mencione alguém");

  const p1 = db[id];
  const p2 = db[alvo.id];

  if (!p2 || !p2.cartas.length) return msg.reply("Inimigo sem cartas");

  const c1 = p1.cartas[Math.floor(Math.random() * p1.cartas.length)];
  const c2 = p2.cartas[Math.floor(Math.random() * p2.cartas.length)];

  const v1 = c1.atk + c1.def + c1.hp + Math.random() * 100 + p1.elo;
  const v2 = c2.atk + c2.def + c2.hp + Math.random() * 100 + p2.elo;

  let res = "";

  if (v1 > v2) {
    p1.elo += 25;
    p2.elo -= 20;
    res = "🏆 Você venceu!";
  } else {
    p1.elo -= 20;
    p2.elo += 25;
    res = "💀 Você perdeu!";
  }

  salvarDB(db);

  msg.reply(`⚔️ ${c1.nome} vs ${c2.nome}\n\n${res}`);
});

client.login(process.env.TOKEN);
