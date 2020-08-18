const puppeteer = require('puppeteer');
const express = require("express");

const app = express();
const port = 3001;

async function sleep(millis) {
  return new Promise(resolve => setTimeout(resolve, millis));
}

// Получение активности по игрокам
const check = async (steam_ids, server_id = 4721) => {
  return await puppeteer.launch({
    headless: true
  }).then(async browser => {
    const page = await browser.newPage();
    const activityResult = [];

    for (const id of steam_ids) {
      await sleep(5000);

      await page.goto(`https://shop.magic-rust.ru/servers/${server_id}/${id}`);
  
      await page.waitForSelector(".table-striped").then(async () => {
        const activity = await page.$eval(".table-striped tbody", element => {
          const activityData = element.lastChild;
          const title = activityData.firstChild.innerHTML;
          const time = activityData.lastChild.innerHTML;
    
          return `${title}: ${time}`;
        });
    
        const player = await page.$eval(".xbox__header", element => {
          const playerData = element.lastChild.innerHTML;
          const name = playerData.match(/"(?:[^"\\]|\\.)*"/)[0];
    
          return name;
        });
    
        activityResult.push(`${player} - ${activity}`);
      })
    };

    browser.close();

    return activityResult;
  })
};

// Получение списка серверов
const serversList = async () => {
  return await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: ['--window-size=1520,700']
  }).then(async browser => {
    const page = await browser.newPage();
    const servers = [];

    await page.goto(`https://shop.magic-rust.ru/products`);

    await page.waitForSelector(".xserver").then(async () => {
      const serversData = await page.evaluate(() => {
        const serversNodes = document.querySelectorAll(".xbox_monitoring .xbox__body .xserver .xserver__title a");
        
        return Object.values(serversNodes).map(server => server.href.match(/(?<=servers[\\\/])(.*)/)[0])
      });

      return serversData;
    })

    browser.close();

    return servers;
  })
};

app.use("/", async (req, res, next) => {
  // ХАрдкод для теста
  check(["76561198998085877"]).then(activity => {
    req.activity = activity;

    next();
  })
});

app.use("/servers", async (req, res, next) => {
  serversList().then(servers => {
    req.servers = servers;

    next();
  })
})

app.get("/", (req, res) => {
  // Пока что возвращается заглушка
  console.log("ACTIVITY", req.activity);
  res.send("<h1>mock</h1>");
});

app.get("/servers", (req, res) => {
  // Пока что возвращается заглушка
  res.send("<h1>2</h1>");
});

app.listen(port, () => {
  console.log("Pidaras cheker running on port", port)
});

// ["76561198022246954", "76561198186846971", "76561198998085877"]