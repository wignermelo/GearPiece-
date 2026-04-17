const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ================= DB =================
function carregarDB() {
  if (!fs.existsSync('./db.json')) fs.writeFileSync('./db.json', '{}');
  return JSON.parse(fs.readFileSync('./db.json'));
}

function salvarDB(db) {
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
}

function garantirUser(db, userId) {
  if (!db[userId]) {
    db[userId] = {
      cartas: [],
      dinheiro: 5000
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

// ================= CHANCES =================
function rolarRaridade(chances) {
  const r = Math.random() * 100;
  let soma = 0;

  for (let tipo in chances) {
    soma += chances[tipo];
    if (r <= soma) return tipo;
  }
}

const chancesBase = {
  Comum: 60,
  Raro: 30,
  Epico: 8,
  Lendario: 1.5,
  Mitico: 0.5
};

const packs = {
  recruta: { preco: 1000, chances: { Comum: 70, Raro: 25, Epico: 5, Lendario: 0, Mitico: 0 } },
  shichibukai: { preco: 5000, chances: { Comum: 50, Raro: 35, Epico: 13, Lendario: 2, Mitico: 0 } },
  almirante: { preco: 10000, chances: { Comum: 30, Raro: 40, Epico: 20, Lendario: 8, Mitico: 2 } },
  yonkou: { preco: 20000, chances: { Comum: 15, Raro: 35, Epico: 30, Lendario: 15, Mitico: 5 } },
  rei: { preco: 40000, chances: { Comum: 5, Raro: 20, Epico: 35, Lendario: 25, Mitico: 15 } }
};

// ================= FUNÇÕES =================
function pegarCarta(raridade) {
  const lista = cartas[raridade];
  const nome = lista[Math.floor(Math.random() * lista.length)];

  return {
    nome,
    raridade,
    valor: valores[raridade]
  };
}

function painel(titulo, desc, user) {
  return new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(desc)
    .setColor("#2b2d31")
    .setAuthor({ name: user.username, iconURL: user.displayAvatarURL() });
}

// ================= BOT =================
client.once('ready', () => console.log("Bot online!"));

// ================= COMANDOS =================
client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;

  let db = carregarDB();
  const id = msg.author.id;
  garantirUser(db, id);

  // 🎴 RECRUTAR
  if (msg.content === "!recrutar") {
    const raridade = rolarRaridade(chancesBase);
    const carta = pegarCarta(raridade);

    const embed = painel(
      "Recrutamento",
      `${carta.nome}\nRaridade: ${carta.raridade}\nValor: ${carta.valor} GC`,
      msg.author
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`g_${id}_${carta.nome}_${carta.raridade}`).setLabel("Guardar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`v_${id}_${carta.nome}_${carta.raridade}`).setLabel("Vender").setEmoji("🏴‍☠️").setStyle(ButtonStyle.Danger)
    );

    return msg.reply({ embeds: [embed], components: [row] });
  }

  // 🛒 LOJA
  if (msg.content === "!loja") {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("buy_recruta").setLabel("Recruta").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("buy_shichibukai").setLabel("Shichibukai").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("buy_almirante").setLabel("Almirante").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("buy_yonkou").setLabel("Yonkou").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("buy_rei").setLabel("Rei").setStyle(ButtonStyle.Danger)
    );

    return msg.reply({ content: "Escolha um pacote:", components: [row] });
  }

  // 📜 COLEÇÃO (ARRUMADO BUG)
  if (msg.content === "!colecao") {
    const lista = db[id].cartas.map((c, i) => `${i + 1}. ${c}`);
    return msg.reply({
      embeds: [painel("Coleção", lista.join("\n") || "Vazia", msg.author)]
    });
  }

  // 💰 CARTEIRA (ARRUMADO BUG)
  if (msg.content === "!carteira") {
    return msg.reply({
      embeds: [painel("Carteira", `Saldo: ${db[id].dinheiro} GC`, msg.author)]
    });
  }
});

// ================= BOTÕES =================
client.on('interactionCreate', async (i) => {
  if (!i.isButton()) return;

  const [acao, id, nome, raridade] = i.customId.split("_");

  // 🔒 PROTEÇÃO (AGORA FUNCIONA CERTO)
  if (i.user.id !== id) {
    return i.reply({ content: "Esse botão não é pra você.", ephemeral: true });
  }

  let db = carregarDB();
  garantirUser(db, id);

  // GUARDAR
  if (acao === "g") {
    db[id].cartas.push(`${nome} (${raridade})`);
    salvarDB(db);
    return i.update({ content: "Guardado!", embeds: [], components: [] });
  }

  // VENDER
  if (acao === "v") {
    db[id].dinheiro += valores[raridade];
    salvarDB(db);
    return i.update({
      content: `Vendido por ${valores[raridade]} GC`,
      embeds: [],
      components: []
    });
  }

  // 🛒 COMPRA DIRETA PELO BOTÃO (SEM CRASH)
  if (i.customId.startsWith("buy_")) {
    const tipo = i.customId.split("_")[1];

    if (!packs[tipo]) return;

    if (db[id].dinheiro < packs[tipo].preco)
      return i.reply({ content: "Sem dinheiro.", ephemeral: true });

    db[id].dinheiro -= packs[tipo].preco;

    const raridadePack = rolarRaridade(packs[tipo].chances);
    const carta = pegarCarta(raridadePack);

    salvarDB(db);

    const embed = painel(
      "Pacote aberto",
      `${carta.nome}\nRaridade: ${carta.raridade}\nValor: ${carta.valor} GC`,
      i.user
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`g_${id}_${carta.nome}_${carta.raridade}`).setLabel("Guardar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`v_${id}_${carta.nome}_${carta.raridade}`).setLabel("Vender").setEmoji("🏴‍☠️").setStyle(ButtonStyle.Danger)
    );

    return i.reply({ embeds: [embed], components: [row] });
  }
});

client.login(process.env.TOKEN);
