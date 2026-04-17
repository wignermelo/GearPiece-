const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

// ================= DB =================
function carregarDB() {
  return JSON.parse(fs.readFileSync('./db.json'));
}

function salvarDB(db) {
  fs.writeFileSync('./db.json', JSON.stringify(db, null, 2));
}

function garantirUser(db, userId) {
  if (!db[userId]) {
    db[userId] = {
      cartas: [],
      dinheiro: 5000 // bônus inicial
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

// valores por raridade
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

// padrão (!recrutar)
const chancesBase = {
  Comum: 60,
  Raro: 30,
  Epico: 8,
  Lendario: 1.5,
  Mitico: 0.5
};

// pacotes
const packs = {
  recruta: {
    preco: 1000,
    chances: { Comum: 70, Raro: 25, Epico: 5, Lendario: 0, Mitico: 0 }
  },
  shichibukai: {
    preco: 5000,
    chances: { Comum: 50, Raro: 35, Epico: 13, Lendario: 2, Mitico: 0 }
  },
  almirante: {
    preco: 10000,
    chances: { Comum: 30, Raro: 40, Epico: 20, Lendario: 8, Mitico: 2 }
  },
  yonkou: {
    preco: 20000,
    chances: { Comum: 15, Raro: 35, Epico: 30, Lendario: 15, Mitico: 5 }
  },
  rei: {
    preco: 40000,
    chances: { Comum: 5, Raro: 20, Epico: 35, Lendario: 25, Mitico: 15 }
  }
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

  // 🎴 RECRUTAR BASE
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
      new ButtonBuilder().setCustomId(`v_${id}_${carta.nome}_${carta.raridade}`).setLabel("Vender").setStyle(ButtonStyle.Danger)
    );

    return msg.reply({ embeds: [embed], components: [row] });
  }

  // 🛒 LOJA
  if (msg.content === "!loja") {
    const embed = painel(
      "Loja de Pacotes",
      `Recruta - 1000 GC
Shichibukai - 5000 GC
Almirante - 10000 GC
Yonkou - 20000 GC
Rei dos Piratas - 40000 GC`,
      msg.author
    );

    return msg.reply({ embeds: [embed] });
  }

  // 📦 COMPRAR PACK
  if (msg.content.startsWith("!comprar")) {
    const tipo = msg.content.split(" ")[1];

    if (!packs[tipo]) return msg.reply("Pack inválido.");

    if (db[id].dinheiro < packs[tipo].preco)
      return msg.reply("Sem dinheiro.");

    db[id].dinheiro -= packs[tipo].preco;

    const raridade = rolarRaridade(packs[tipo].chances);
    const carta = pegarCarta(raridade);

    salvarDB(db);

    const embed = painel(
      "Pacote aberto",
      `${carta.nome}\nRaridade: ${carta.raridade}\nValor: ${carta.valor} GC`,
      msg.author
    );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`g_${id}_${carta.nome}_${carta.raridade}`).setLabel("Guardar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`v_${id}_${carta.nome}_${carta.raridade}`).setLabel("Vender").setStyle(ButtonStyle.Danger)
    );

    return msg.reply({ embeds: [embed], components: [row] });
  }

  // 📜 COLEÇÃO
  if (msg.content === "!colecao") {
    const lista = db[id].cartas.map((c, i) => `${i + 1}. ${c}`);
    return msg.reply({ embeds: [painel("Coleção", lista.join("\n") || "Vazia", msg.author)] });
  }

  // 💰 CARTEIRA
  if (msg.content === "!carteira") {
    return msg.reply({ embeds: [painel("Carteira", `Saldo: ${db[id].dinheiro} GC`, msg.author)] });
  }
});

// ================= BOTÕES =================
client.on('interactionCreate', async (i) => {
  if (!i.isButton()) return;

  const [acao, id, nome, raridade] = i.customId.split("_");
  if (i.user.id !== id) return;

  let db = carregarDB();
  garantirUser(db, id);

  if (acao === "g") {
    db[id].cartas.push(`${nome} (${raridade})`);
    salvarDB(db);
    return i.update({ content: "Guardado!", embeds: [], components: [] });
  }

  if (acao === "v") {
    db[id].dinheiro += valores[raridade];
    salvarDB(db);
    return i.update({ content: `Vendido por ${valores[raridade]} GC`, embeds: [], components: [] });
  }
});

client.login(process.env.TOKEN);
