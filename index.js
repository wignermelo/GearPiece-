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

function garantirUser(db, userId) {
  if (!db[userId]) {
    db[userId] = { cartas: [], dinheiro: 5000 };
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

const packs = {
  recruta: { preco: 1000 },
  shichibukai: { preco: 5000 },
  almirante: { preco: 10000 },
  yonkou: { preco: 20000 },
  rei: { preco: 40000 }
};

// ================= HELPERS =================
function pegarCarta(raridade) {
  const lista = cartas[raridade];
  return {
    nome: lista[Math.floor(Math.random() * lista.length)],
    raridade,
    valor: valores[raridade]
  };
}

function painelLoja(user, pack, db) {
  const preco = packs[pack].preco;
  const saldo = db[user.id].dinheiro;

  return new EmbedBuilder()
    .setTitle(`Pacote: ${pack}`)
    .setDescription(
`💰 Preço: ${preco} GC
💳 Seu saldo: ${saldo} GC`
    )
    .setColor("#2b2d31");
}

// ================= BOT =================
client.once('ready', () => console.log("Bot online!"));

// ================= MESSAGE =================
client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;

  let db = carregarDB();
  const id = msg.author.id;
  garantirUser(db, id);

  if (msg.content === "!recrutar") {
    const rar = Object.keys(cartas)[Math.floor(Math.random() * 5)];
    const carta = pegarCarta(rar);

    const embed = new EmbedBuilder()
      .setTitle(carta.nome)
      .setDescription(`${carta.raridade} - ${carta.valor} GC`)
      .setColor("#2b2d31");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`g_${id}_${carta.nome}_${carta.raridade}`).setLabel("Guardar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`v_${id}_${carta.nome}_${carta.raridade}`).setLabel("Vender").setStyle(ButtonStyle.Danger)
    );

    return msg.reply({ embeds: [embed], components: [row] });
  }

  if (msg.content === "!loja") {
    let db = carregarDB();

    const select = new StringSelectMenuBuilder()
      .setCustomId(`pack_${id}`)
      .setPlaceholder("Escolha um pacote")
      .addOptions(Object.keys(packs).map(p => ({ label: p, value: p })));

    const row = new ActionRowBuilder().addComponents(select);

    return msg.reply({
      embeds: [painelLoja(msg.author, "recruta", db)],
      components: [row]
    });
  }

  if (msg.content === "!vender") {
    let db = carregarDB();
    if (!db[id].cartas.length) return msg.reply("Sem cartas.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`sell_${id}`)
      .setPlaceholder("Vender carta")
      .addOptions(db[id].cartas.map((c, i) => ({ label: c, value: String(i) })));

    return msg.reply({
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }
});

// ================= INTERACTIONS (ANTI CRASH TOTAL) =================
client.on('interactionCreate', async (i) => {
  try {
    let db = carregarDB();
    if (!i.customId) return;

    const parts = i.customId.split("_");

    const type = parts[0];
    const id = parts[1];

    if (id && i.user.id !== id) {
      return i.reply({ content: "Isso não é pra você.", ephemeral: true });
    }

    garantirUser(db, id);

    // ================= BUTTONS =================
    if (i.isButton()) {

      if (type === "g") {
        const [, id, nome, raridade] = parts;
        db[id].cartas.push(`${nome} (${raridade})`);
        salvarDB(db);
        return i.update({ content: "Guardado!", components: [] });
      }

      if (type === "v") {
        const raridade = parts[3];
        db[id].dinheiro += valores[raridade];
        salvarDB(db);
        return i.update({ content: "Vendido!", components: [] });
      }

      if (type === "confirm") {
        const pack = parts[2];

        if (db[id].dinheiro < packs[pack].preco)
          return i.reply({ content: "Sem dinheiro.", ephemeral: true });

        db[id].dinheiro -= packs[pack].preco;

        const rar = Object.keys(cartas)[Math.floor(Math.random() * 5)];
        const carta = pegarCarta(rar);

        salvarDB(db);

        return i.update({
          content: `Você ganhou: ${carta.nome}`,
          components: []
        });
      }
    }

    // ================= SELECT =================
    if (i.isStringSelectMenu()) {

      const tipo = parts[0];

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
        const rar = carta.match(/\((.*?)\)/)[1];

        db[id].dinheiro += valores[rar];
        db[id].cartas.splice(index, 1);
        salvarDB(db);

        return i.update({ content: `Vendeu ${carta}`, components: [] });
      }

      if (tipo === "view") {
        return i.update({ content: db[id].cartas[i.values[0]] });
      }
    }

  } catch (err) {
    console.log("ERRO INTERACTION:", err);

    if (i.replied || i.deferred) return;
    return i.reply({
      content: "Ocorreu um erro na interação.",
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);
