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

// ================= PACKS =================
const packs = {
  recruta: { preco: 1000 },
  shichibukai: { preco: 5000 },
  almirante: { preco: 10000 },
  yonkou: { preco: 20000 },
  rei: { preco: 40000 }
};

function pegarCarta(raridade) {
  const lista = cartas[raridade];
  const nome = lista[Math.floor(Math.random() * lista.length)];

  return {
    nome,
    raridade,
    valor: valores[raridade]
  };
}

function painelLoja(user, pack, db) {
  const preco = packs[pack].preco;
  const saldo = db[user.id].dinheiro;
  const restante = saldo - preco;

  return new EmbedBuilder()
    .setTitle(`Pacote: ${pack}`)
    .setDescription(
`💰 Preço: ${preco} GC
💳 Seu saldo: ${saldo} GC
📉 Após compra: ${restante >= 0 ? restante : "Saldo insuficiente"}`
    )
    .setColor("#2b2d31");
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
    const raridades = ["Comum","Raro","Epico","Lendario","Mitico"];
    const raridade = raridades[Math.floor(Math.random() * raridades.length)];
    const carta = pegarCarta(raridade);

    const embed = new EmbedBuilder()
      .setTitle(carta.nome)
      .setDescription(`Raridade: ${carta.raridade}\nValor: ${carta.valor} GC`)
      .setColor("#2b2d31");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`g_${id}_${carta.nome}_${carta.raridade}`).setLabel("Guardar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`v_${id}_${carta.nome}_${carta.raridade}`).setLabel("Vender").setEmoji("🏴‍☠️").setStyle(ButtonStyle.Danger)
    );

    return msg.reply({ embeds: [embed], components: [row] });
  }

  // 🛒 LOJA
  if (msg.content === "!loja") {
    let db = carregarDB();

    const select = new StringSelectMenuBuilder()
      .setCustomId(`pack_${id}`)
      .setPlaceholder("Escolha um pacote")
      .addOptions(
        Object.keys(packs).map(p => ({
          label: p,
          value: p
        }))
      );

    const row = new ActionRowBuilder().addComponents(select);

    const confirm = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`confirm_${id}_recruta`)
        .setLabel("Comprar")
        .setStyle(ButtonStyle.Success)
    );

    return msg.reply({
      embeds: [painelLoja(msg.author, "recruta", db)],
      components: [row, confirm]
    });
  }

  // 📜 COLEÇÃO MENU
  if (msg.content === "!colecao") {
    if (!db[id].cartas.length) return msg.reply("Sem cartas.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`view_${id}`)
      .setPlaceholder("Ver carta")
      .addOptions(
        db[id].cartas.map((c, i) => ({
          label: c,
          value: i.toString()
        }))
      );

    return msg.reply({
      content: "Sua coleção:",
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // 💰 VENDER MENU
  if (msg.content === "!vender") {
    if (!db[id].cartas.length) return msg.reply("Sem cartas.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`sell_${id}`)
      .setPlaceholder("Vender carta")
      .addOptions(
        db[id].cartas.map((c, i) => ({
          label: c,
          value: i.toString()
        }))
      );

    return msg.reply({
      content: "Escolha uma carta:",
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }
});

// ================= INTERAÇÕES =================
client.on('interactionCreate', async (i) => {
  let db = carregarDB();

  if (!i.customId) return;

  // ================= PROTEÇÃO SEGURA =================
  let userId = null;

  if (i.customId.startsWith("g_") || i.customId.startsWith("v_")) {
    userId = i.customId.split("_")[1];
  }

  if (i.customId.startsWith("confirm_")) {
    userId = i.customId.split("_")[1];
  }

  if (i.customId.startsWith("pack_") || i.customId.startsWith("sell_") || i.customId.startsWith("view_")) {
    userId = i.customId.split("_")[1];
  }

  if (userId && i.user.id !== userId) {
    return i.reply({ content: "Isso não é pra você.", ephemeral: true });
  }

  // ================= BOTÕES =================
  if (i.isButton()) {

    if (i.customId.startsWith("g_")) {
      const [, id, nome, raridade] = i.customId.split("_");
      db[id].cartas.push(`${nome} (${raridade})`);
      salvarDB(db);
      return i.update({ content: "Guardado!", components: [] });
    }

    if (i.customId.startsWith("v_")) {
      const [, id, , raridade] = i.customId.split("_");
      db[id].dinheiro += valores[raridade];
      salvarDB(db);
      return i.update({ content: "Vendido!", components: [] });
    }

    if (i.customId.startsWith("confirm_")) {
      const [, id, pack] = i.customId.split("_");

      if (db[id].dinheiro < packs[pack].preco)
        return i.reply({ content: "Sem dinheiro.", ephemeral: true });

      db[id].dinheiro -= packs[pack].preco;

      const raridades = Object.keys(cartas);
      const raridade = raridades[Math.floor(Math.random() * raridades.length)];
      const carta = pegarCarta(raridade);

      salvarDB(db);

      return i.update({
        content: `Você ganhou: ${carta.nome}`,
        components: []
      });
    }
  }

  // ================= SELECT MENU =================
  if (i.isStringSelectMenu()) {

    const [tipo, id] = i.customId.split("_");

    if (tipo === "pack") {
      const pack = i.values[0];

      const confirm = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`confirm_${id}_${pack}`)
          .setLabel("Comprar")
          .setStyle(ButtonStyle.Success)
      );

      return i.update({
        embeds: [painelLoja(i.user, pack, db)],
        components: [i.message.components[0], confirm]
      });
    }

    if (tipo === "sell") {
      const index = i.values[0];
      const carta = db[id].cartas[index];
      const raridade = carta.match(/\((.*?)\)/)[1];

      db[id].dinheiro += valores[raridade];
      db[id].cartas.splice(index, 1);
      salvarDB(db);

      return i.update({ content: `Vendeu ${carta}`, components: [] });
    }

    if (tipo === "view") {
      const carta = db[id].cartas[i.values[0]];
      return i.update({ content: `Carta: ${carta}` });
    }
  }
});

client.login(process.env.TOKEN);
