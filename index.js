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
    db[userId] = {
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

// ================= 🔥 CHANCES RESTAURADAS =================
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

  for (let tipo in chances) {
    soma += chances[tipo];
    if (r <= soma) return tipo;
  }

  return "Comum";
}

// ================= PACKS =================
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

// ================= BOT =================
client.once('ready', () => console.log("Bot online!"));

// ================= MESSAGE =================
client.on('messageCreate', (msg) => {
  if (msg.author.bot) return;

  let db = carregarDB();
  const id = msg.author.id;
  garantirUser(db, id);

  // 🎴 RECRUTAR (AGORA COM % REAL)
  if (msg.content === "!recrutar") {

    const rar = rolarRaridade(); // 🔥 AQUI ESTÁ O FIX
    const carta = pegarCarta(rar);

    const embed = new EmbedBuilder()
      .setTitle(carta.nome)
      .setDescription(
`✨ Raridade: ${carta.raridade}
💰 Valor: ${carta.valor} GC`
      )
      .setColor("#2b2d31");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`g_${id}_${carta.nome}_${carta.raridade}`)
        .setLabel("Guardar")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`v_${id}_${carta.nome}_${carta.raridade}`)
        .setLabel("Vender")
        .setStyle(ButtonStyle.Danger)
    );

    return msg.reply({ embeds: [embed], components: [row] });
  }

  // 🛒 LOJA
  if (msg.content === "!loja") {
    const select = new StringSelectMenuBuilder()
      .setCustomId(`pack_${id}`)
      .setPlaceholder("Escolha um pacote")
      .addOptions(
        Object.keys(packs).map(p => ({
          label: p,
          value: p
        }))
      );

    return msg.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("Loja de Pacotes")
          .setDescription("Escolha um pacote abaixo")
          .setColor("#2b2d31")
      ],
      components: [new ActionRowBuilder().addComponents(select)]
    });
  }

  // 📦 PACOTES
  if (msg.content === "!pacote") {
    let pacotes = db[id].pacotes;

    const options = Object.keys(pacotes)
      .filter(p => pacotes[p] > 0)
      .map(p => ({
        label: `${p} (${pacotes[p]})`,
        value: p
      }));

    if (!options.length) return msg.reply("Sem pacotes.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`openpack_${id}`)
      .setPlaceholder("Abrir pacote")
      .addOptions(options);

    return msg.reply({
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // 💰 VENDER MENU
  if (msg.content === "!vender") {
    if (!db[id].cartas.length) return msg.reply("Sem cartas.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`sell_${id}`)
      .setPlaceholder("Vender carta")
      .addOptions(db[id].cartas.map((c, i) => ({
        label: c,
        value: String(i)
      })));

    return msg.reply({
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }

  // 📜 COLEÇÃO
  if (msg.content === "!colecao") {
    if (!db[id].cartas.length) return msg.reply("Sem cartas.");

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`view_${id}`)
      .setPlaceholder("Ver carta")
      .addOptions(db[id].cartas.map((c, i) => ({
        label: c,
        value: String(i)
      })));

    return msg.reply({
      components: [new ActionRowBuilder().addComponents(menu)]
    });
  }
});

// ================= INTERACTIONS =================
client.on('interactionCreate', async (i) => {
  try {
    let db = carregarDB();
    if (!i.customId) return;

    const parts = i.customId.split("_");
    const type = parts[0];
    const userId = parts[1];

    if (userId && i.user.id !== userId) {
      return i.reply({ content: "Isso não é pra você.", ephemeral: true });
    }

    garantirUser(db, i.user.id);

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
        db[userId].dinheiro += valores[raridade];
        salvarDB(db);
        return i.update({ content: "Vendido!", components: [] });
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
              .setDescription(`Preço: ${packs[pack].preco} GC`)
              .setColor("#2b2d31")
          ],
          components: [
            new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId(`confirm_${userId}_${pack}`)
                .setLabel("Comprar")
                .setStyle(ButtonStyle.Success)
            )
          ]
        });
      }

      if (type === "openpack") {
        const pack = i.values[0];

        if (db[userId].pacotes[pack] <= 0)
          return i.reply({ content: "Sem pacotes.", ephemeral: true });

        db[userId].pacotes[pack]--;

        const rar = rolarRaridade(); // 🔥 aqui também ficou melhor
        const carta = pegarCarta(rar);

        db[userId].cartas.push(`${carta.nome} (${carta.raridade})`);

        salvarDB(db);

        return i.update({
          content: `📦 Você abriu ${pack} e ganhou ${carta.nome}`,
          components: []
        });
      }
    }

  } catch (err) {
    console.log(err);
    if (!i.replied) {
      return i.reply({ content: "Erro interno", ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
