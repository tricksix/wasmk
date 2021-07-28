
const venom = require('venom-bot');
const express = require('express');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');

const app = express();
const {createSimport} = require('simport');
const simport = createSimport(__filename);


// 6285811802580@c.us
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('assets'));
app.use(express.json());

app.set('views', __dirname + '/views');
app.set('view engine', 'twig');
app.set('twig options', { 
    strict_variables: false
});

const PORT = 3000;

var State = {
  statusSession: null
}

async function start(client){

  app.listen(PORT, function () {
    console.log(`\n• Listening on port ${PORT}!`);
  });

  app.get("/login", async (req, res) => {
    if(State.statusSession == "notLogged") {
      res.render("home");
    } else {
      res.json({
        status: State.statusSession
      });
    }
  });

  app.get("/playground", async (req, res) => {
    res.render("playground");
  });

  app.post("/apiSendText", [
    body("phone_number", "cannot be empty").notEmpty(),
    body("phone_message", "cannot be empty").notEmpty(),
    body("qty", "cannot be empty").notEmpty()
  ], async (req, res) => {
    try {
      const errors = validationResult(req);
      if(!errors.isEmpty()) {
        res.json({
          error: true,
          data: errors
        })
        return;
      }

      for(let i=1; i <= parseInt(req.body.qty); i++) {

        queue.add(async () => {
          try {
            await client.sendText(req.body.phone_number, req.body.phone_message)
            return Promise.resolve(true);
          } catch(e) {
            return Promise.reject(new Error(e));
          }
        });

      }
      res.json({
        error: false,
        data: req.body
      });
    } catch(e) {
      res.send(e.toString());
    }

  });

  app.get("/getAllContacts", async (req, res) => {
    try {
      let response = await client.getAllContacts();
      res.send(JSON.stringify(response));
    } catch(e) {
      res.send(e.toString());
    }
  });

  app.get("/getDeviceInfo", async (req, res) => {

    try {

      let hostDevice = await client.getHostDevice();
      let connectionState = await client.getConnectionState();
      let batteryLevel = await client.getBatteryLevel();
      let isConnected = await client.isConnected();
      let waVersion = await client.getWAVersion();

      res.json({
        hostDevice,
        connectionState,
        batteryLevel,
        isConnected,
        waVersion
      });
    } catch(e) {
      res.send(e.toString());
    }
  });

  const PQueue = (await simport('../bootwa/node_modules/p-queue/dist/index.js')).default;

  const queue = new PQueue();

  process.on('unhandledRejection', error => {
    console.log('Error : ', error.message);
  });

  queue.on("error", (error) => {
    console.log("Error : ", error);
  });
  
  queue.on("completed", (result) => {
    console.log("Berhasil Dikirim");
  });

  client.onStateChange((state) => {

    console.log('State changed: ', state);
    
    if('CONFLICT'.includes(state)) {
      client.useHere()
    };

    if('UNPAIRED'.includes(state)) {
      console.log('logout')
    };

  });

  let time = 0;

  client.onStreamChange((state) => {

    console.log('State Connection Stream: ' + state);

    clearTimeout(time);
    
    if(state === 'DISCONNECTED' || state === 'SYNCING') {
      time = setTimeout(() => {
        client.close();
      }, 80000);
    }
  });

  client.onIncomingCall(async (call) => {
    console.log(call);
    client.sendText(call.peerJid, "Sorry, I still can't answer calls");
  });

  process.on('SIGINT', function() {
    console.log("EXIT");
    client.close();
  });

}

venom
  .create(
    'Covid19',
    (base64Qr, asciiQR, attempts, urlCode) => {
      let matches = base64Qr.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
        response = {};
      if (matches.length !== 3) {
        return new Error('Invalid input string');
      }
      response.type = matches[1];
      response.data = new Buffer.from(matches[2], 'base64');
      let imageBuffer = response;
      require('fs').writeFile(
        'assets/wa-storage/qr/out.png',
        imageBuffer['data'],
        'binary',
        function (err) {
          if (err != null) {
            console.log(err);
          }
        }
      );
    },
    (statusSession, session) => {
      console.log('Status Session: ', statusSession);
      State.statusSession = statusSession;
    },
    {
      folderNameToken: 'assets/wa-storage/session', //folder name when saving tokens
      mkdirFolderToken: '', //folder directory tokens, just inside the venom folder, example:  { mkdirFolderToken: '/node_modules', } //will save the tokens folder in the node_modules directory
      headless: true, // Headless chrome
      devtools: false, // Open devtools by default
      useChrome: false, // If false will use Chromium instance
      debug: false, // Opens a debug session
      logQR: true, // Logs QR automatically in terminal
      browserWS: '', // If u want to use browserWSEndpoint
      browserArgs: ["--no-sandbox"], //Original parameters  ---Parameters to be added into the chrome browser instance
      puppeteerOptions: {}, // Will be passed to puppeteer.launch
      disableSpins: true, // Will disable Spinnies animation, useful for containers (docker) for a better log
      disableWelcome: true, // Will disable the welcoming message which appears in the beginning
      updatesLog: true, // Logs info updates automatically in terminal
      autoClose: 0, // Automatically closes the venom-bot only when scanning the QR code (default 60 seconds, if you want to turn it off, assign 0 or false)
      createPathFileToken: true, //creates a folder when inserting an object in the client's browser, to work it is necessary to pass the parameters in the function create browserSessionToken
    },
    undefined,
    undefined
  )
  .then( client => start(client))
  .catch((erro) => {
    console.log(erro);
  });