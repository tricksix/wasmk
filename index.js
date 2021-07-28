
const venom = require('venom-bot');
const express = require('express');
const bodyParser = require('body-parser');
const { body, validationResult } = require('express-validator');
const moment = require("moment");

const app = express();
const {createSimport} = require('simport');
const simport = createSimport(__filename);
const winston = require('winston');
// const chatsAllNew = getAllChatsNewMsg();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('assets'));
app.use(express.json());

app.set('views', __dirname + '/views');
app.set('view engine', 'twig');
app.set('twig options', { 
    strict_variables: false
});

const PORT = 1234;

var State = {
  statusSession: null
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: {
    service: 'system-logs'
  },
  transports: [
    new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: './logs/combined.log' }),
  ],
});

async function start(client){

  app.listen(PORT, function () {
    console.log(`\n• Listening on port ${PORT}!`);
  });

  app.get("/login", async (req, res) => {
    if(State.statusSession == "notLogged" || State.statusSession == "deviceNotConnected") {
      res.render("home");
    } else {
      res.json({
        status: State.statusSession
      });
    }
  });

 
  app.get("/check", async (req, res) => {
    
    let connectedState = await client.getConnectionState();
    let isConnected = await client.isConnected();
    res.json({
      connectedState: connectedState,
      isConnected: isConnected,
    });

  });
  app.post("/apiSendText", [
    body("phone_number", "cannot be empty").notEmpty(),
    body("phone_message", "cannot be empty").notEmpty(),
  
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

      let isConnected = await client.isConnected();
      if(!isConnected) {
        throw new Error("Device Not Connected");
      }
      await new Promise(async (resolve, reject) => {

        process.on('unhandledRejection', async (err) => {
          reject(new Error(err.toString()));
        });
        process.on('uncaughtException', async (err) => {
          reject(new Error(err.toString()));
        });

        res.setTimeout(parseInt(10000), () => {
            reject(new Error('The message has been processed, please wait a few minutes'));
        });

        let isExistNumber = await client.checkNumberStatus(req.body.phone_number);

        if(isExistNumber) {
          // await client.sendText(req.body.phone_number, req.body.phone_message);
          await client
  .sendImage(
    req.body.phone_number,
    './gambar/fotoscaka.png',
    'SCAKA-Ngoro',
    req.body.phone_message
  )
  // .then((result) => {
  //   console.log('Result: ', result); //return object success
  // })
  // .catch((erro) => {
  //   console.error('Error when sending: ', erro); //return object error
  // });
          logger.log({
            level: "info",
            message: `${moment().format("YYYYMMDDHHmmss")} - ${JSON.stringify(req.body)}`
          });
        } else {
          logger.log({
            level: "error",
            message: `${moment().format("YYYYMMDDHHmmss")} - The number does not exist`
          });
        }
        resolve();
      });
      res.json({
        error: false,
        data: req.body
      });
    } catch(e) {

      logger.log({
        level: "error",
        message: `${moment().format("YYYYMMDDHHmmss")} - ${e.toString()}`
      });

      res.json({
        error: true,
        data: e.toString(),
        params: req.body
      });

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

  const PQueue = (await simport('../wasmk/node_modules/p-queue/dist/index.js')).default;

  const queue = new PQueue({
    concurrency: 1
  });

  process.on('unhandledRejection', error => {
    logger.log({
      level: "error",
      message: `${moment().format("YYYYMMDDHHmmss")} - ${error.message}`
    });
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

 
  client.onMessage((message) => {
    if (message.body === '1' && message.isGroupMsg === false) {
      client
        .sendText(message.from, 'Kami mempunyai 2 cara untuk kamu melakukan pendaftaran, bisa melalui link : \nUnduh Formulir : https://ppdb.smkcakrakusuma.sch.id/Tamplate_import/formulir_ppdb.pdf \n\nPendaftaran Online https://ppdb.smkcakrakusuma.sch.id/')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    }else if(message.body === '2' && message.isGroupMsg === false) {
      client
        .sendText(message.from, 'Kamu bisa melihatnya melalui link *https://bit.ly/smkcakrakusuma* \n\n```Agar kamu tidak tersesat, bukalah link dengan google maps untuk menuju ke lokasi kami!```')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });

    }else if(message.body === '3' && message.isGroupMsg === false) {
      client
        .sendText(message.from, '*Fasilitas SMK CAKRA KUSUMA*\n1⃣ Asrama Bagi Siswa Jauh\n2⃣ Lab Komputer\n3⃣ Kantin\n4⃣ dst')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
      
    }else if(message.body === '4' && message.isGroupMsg === false) {
      client
        .sendText(message.from, 'Informasi lebih lanjut silahkan hubungi tata usaha kami, silahkan Masukkan menu 0⃣ untuk kami kirimkan nomor Whatsapp Tata Usaha SMK CAKRA KUSUMA')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    }else if(message.body === '5' && message.isGroupMsg === false) {
      client
        .sendText(message.from, 'Menu 5 masih dalam pengembangan, nantinya kamu cukup balas dengan NIS kamu, dan kamu akan dapatkan rekap nilai\nCobalah Menu lain!\n\n```Hai cobalah kirim gambar kepadaku, nanti saya akan buatkan stiker untukmu. ini gratis lho!```')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    }else if(message.body === '6' && message.isGroupMsg === false) {
      client
        .sendText(message.from, 'Menu 6 masih dalam pengembangan, nantinya kamu cukup balas dengan NIS kamu, dan kamu akan dapatkan rekap nilai\nCobalah Menu lain!\n\n```Hai cobalah kirim gambar kepadaku, nanti saya akan buatkan stiker untukmu. ini gratis lho!```')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    }else if(message.body === '0' && message.isGroupMsg === false) {
      client
        .sendText(message.from, 'Hubungi Tata Usaha kami di nomor\n☎ Ibu ... : *08123456789*\n\n\n\n```Hai cobalah kirim gambar kepadaku, nanti saya akan buatkan stiker untukmu. ini gratis lho!```')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    }else if(message.body === 'Menu' || message.body === 'menu' && message.isGroupMsg === false) {
      client
        .sendText(message.from, 'Silahkan pilih menu di bawah ini :\n\n1⃣ Informasi Pendaftaran\n2⃣ Informasi Lokasi Pendaftaran\n3⃣ Informasi Fasilitas\n4⃣ Informasi Biaya Pendaftaran\n5⃣ Nilai Raport\n6⃣ Informasi Pelanggaran\n```atau```\n0⃣ Untuk Terhubung Dengan Tata Usaha\n\n```Pesan Ini Dikirim Otomatis Oleh Sistem```\nHappy Online\n*SMK CAKRA KUSUMA*')
        .then((result) => {
          console.log('Result: ', result); //return object success
        })
        .catch((erro) => {
          console.error('Error when sending: ', erro); //return object error
        });
    }else if(message.body === 'Stiker' || message.body === 'stiker' && message.isGroupMsg === false) {
     
      client
      .sendImageAsSticker(message.from, './image.jpeg')
      .then((result) => {
        console.log('Result: ', result); //return object success
      })
      .catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
      });
     
    }else if(message.isMedia === true || message.isMMS === true && message.isGroupMsg === false) {
     
      client
      // .sendText(message.from, message.sender.id)
      // .sendText(message.from, message.sender.id)
       .sendImageAsSticker(message.from, message.content)
       .then((result) => {
        //  console.log('Result: ', result); //return object success
         console.log('===========================');
         console.log(message, msg => {
          console.log(msg);
        }); //return object success
       })
       .catch((erro) => {
         console.error('Error when sending: ', erro); //return object error
       });
      
     }else{
      client
      .sendText(message.from, '```Mohon tidak membalas pesan ini dengan bahasa lain, terhubunglah dengan tata usaha kami dengan mengirim angka 0⃣```.\n\nSilahkan tekan sesuai menu ya!.\n*Selamat Siang,*\nIni Pesan Uji Coba Informasi Pendaftaran *SMK CAKRA KUSUMA NGORO*🏢,\nSilahkan pilih menu di bawah ini :\n\n1⃣ Informasi Pendaftaran\n2⃣ Informasi Lokasi Pendaftaran\n3⃣ Informasi Fasilitas\n4⃣ Informasi Biaya Pendaftaran\n5⃣ Nilai Raport\n6⃣ Informasi Pelanggaran\n```atau```\n0⃣ Untuk Terhubung Dengan TU\n\n```Pesan Ini Dikirim Otomatis Oleh Sistem```\nHappy Online\n*SMK CAKRA KUSUMA*')
      .then((result) => {
        console.log('Result: ', result); //return object success
       
      })
      .catch((erro) => {
        console.error('Error when sending: ', erro); //return object error
      });
    
   
    }

  
  });
  client.onStateChange((state) => {

    if('CONFLICT'.includes(state)) {
      client.useHere()
    };

    if('UNPAIRED'.includes(state)) {
      console.log('logout')
    };

  });

 

  client.onIncomingCall(async (call) => {
    console.log(call);
    client.sendText(call.peerJid, "*Maaf Ya🙏*,\n Saya sedang tidak bisa menerima panggilan.\nNomor ini bersifat satu arah, silahkan kontak admin di nomor 08123456789 \n\n ```Pesan Dikirim Otomatis```\nKetik *Menu* untuk menampilkan menu bantuan anda.");
  });

 


}

venom
  .create(
    'SCAKA',
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
      browserArgs: ['--no-sandbox', '--disable-setuid-sandbox'], //Original parameters  ---Parameters to be added into the chrome browser instance
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
 
