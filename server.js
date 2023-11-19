require('dotenv').config();

const Promise = require('bluebird')  
const AppDAO = require('./dao')  
const SessionTTKRepository = require('./sessionttk_repository')  
const ClientTTKRepository = require('./clientttk_repository')

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { TikTokConnectionWrapper, getGlobalConnectionCount } = require('./connectionWrapper');
const { clientBlocked } = require('./limiter');
const dao = new AppDAO('./database.sqlite3')
// const blogSessionData = { name: 'xxxxxxxxxxxxxxxxxxx' }
const sessionTTKRepo = new SessionTTKRepository(dao)
const clientTTKRepo = new ClientTTKRepository(dao)
const app = express();
const httpServer = createServer(app);

// Enable cross origin resource sharing
const io = new Server(httpServer, {
    cors: {
        origin: '*'
    }
});


io.on('connection', (socket) => {
    let tiktokConnectionWrapper;
    let currentSessionId;
    console.info('New connection from origin', socket.handshake.headers['origin'] || socket.handshake.headers['referer']);

    socket.on('setUniqueId', (uniqueId, options) => {

        // Prohibit the client from specifying these options (for security reasons)
        if (typeof options === 'object' && options) {
            delete options.requestOptions;
            delete options.websocketOptions;
        } else {
            options = {};
        }

        // Session ID in .env file is optional
        if (process.env.SESSIONID) {
            options.sessionId = process.env.SESSIONID;
            console.info('Using SessionId');
        }

        // Check if rate limit exceeded
        if (process.env.ENABLE_RATE_LIMIT && clientBlocked(io, socket)) {
            socket.emit('tiktokDisconnected', 'You have opened too many connections or made too many connection requests. Please reduce the number of connections/requests or host your own server instance. The connections are limited to avoid that the server IP gets blocked by TokTok.');
            return;
        }

        // Connect to the given username (uniqueId)
        try {
            tiktokConnectionWrapper = new TikTokConnectionWrapper(uniqueId, options, true);
            tiktokConnectionWrapper.connect();
        } catch (err) {
            socket.emit('tiktokDisconnected', err.toString());
            return;
        }

        // Redirect wrapper control events once
        tiktokConnectionWrapper.once('connected', state => {
            socket.emit('tiktokConnected', state)
            console.log(`tiktokConnectionWrapper state = connected`)
            console.log(`tiktokConnectionWrapper roomId = ${state.roomId} username = ${uniqueId}`)
            sessionTTKRepo.create(uniqueId).then((data)=> {
                console.log(`created sessionid = ${data.id} for username = ${uniqueId}`)
                currentSessionId = data.id
            })
            
        });
        tiktokConnectionWrapper.once('disconnected', reason => {
            socket.emit('tiktokDisconnected', reason)
            sessionTTKRepo.updateEndSession(currentSessionId)
            console.log(`updateEndSession sessionid = ${currentSessionId} for username = ${uniqueId}`)
        });

        // Notify client when stream ends
        tiktokConnectionWrapper.connection.on('streamEnd', () => {
            socket.emit('streamEnd')
            sessionTTKRepo.updateEndSession(currentSessionId)});
            console.log(`updateEndSession sessionid = ${currentSessionId} for username = ${uniqueId}`)

        // Redirect message events
        tiktokConnectionWrapper.connection.on('roomUser', msg => socket.emit('roomUser', msg));
        tiktokConnectionWrapper.connection.on('member', msg => {
            socket.emit('member', msg)
            clientTTKRepo.create(msg.uniqueId, "joined", false, currentSessionId).then((data)=> {
                console.log(`insert clientTTKid = ${data.id} for ttkusername = ${msg.uniqueId}`)
            })            
        });
        tiktokConnectionWrapper.connection.on('chat', msg => {
            socket.emit('chat', msg)
            clientTTKRepo.create(msg.uniqueId, msg.comment, true, currentSessionId).then((data)=> {
                console.log(`insert comment clientTTKid = ${data.id} for ttkusername = ${msg.uniqueId}`)
            }) 
        });
        tiktokConnectionWrapper.connection.on('gift', msg => socket.emit('gift', msg));
        tiktokConnectionWrapper.connection.on('social', msg => socket.emit('social', msg));
        tiktokConnectionWrapper.connection.on('like', msg => {
            socket.emit('like', msg)
            clientTTKRepo.create(msg.uniqueId, "like", true, currentSessionId).then((data)=> {
                console.log(`insert like clientTTKid = ${data.id} for ttkusername = ${msg.uniqueId}`)
            }) 
        });
        tiktokConnectionWrapper.connection.on('questionNew', msg => socket.emit('questionNew', msg));
        tiktokConnectionWrapper.connection.on('linkMicBattle', msg => socket.emit('linkMicBattle', msg));
        tiktokConnectionWrapper.connection.on('linkMicArmies', msg => socket.emit('linkMicArmies', msg));
        tiktokConnectionWrapper.connection.on('liveIntro', msg => socket.emit('liveIntro', msg));
        tiktokConnectionWrapper.connection.on('emote', msg => socket.emit('emote', msg));
        tiktokConnectionWrapper.connection.on('envelope', msg => socket.emit('envelope', msg));
        tiktokConnectionWrapper.connection.on('subscribe', msg => socket.emit('subscribe', msg));
        // initDB()
    });

    socket.on('disconnect', () => {
        if (tiktokConnectionWrapper) {
            tiktokConnectionWrapper.disconnect();
        }
    });
});
// initDB()
checkDB()
// Emit global connection statistics
setInterval(() => {
    io.emit('statistic', { globalConnectionCount: getGlobalConnectionCount() });
}, 5000)
function checkDB(){
    sessionTTKRepo.createTable()
    .then(() => clientTTKRepo.createTable())
    .then(() => sessionTTKRepo.getAll()).then((sessionttks) => {
        sessionttks.forEach((sessionttk) => {
            console.log(`\nRetreived sessionttk from database`)
            console.log(`sessionttk id = ${sessionttk.id}`)
            console.log(`sessionttk name = ${sessionttk.name}`)
            console.log(`sessionttk datetime_start = ${sessionttk.datetime_start}`)
            console.log(`sessionttk datetime_end = ${sessionttk.datetime_end}`)
            sessionTTKRepo.getClientInSession(sessionttk.id).then((clientttks) => {
                // console.log('\nRetrieved sessionttk clientttk from database')
                return new Promise((resolve, reject) => {
                  clientttks.forEach((clientttk) => {
                    if(clientttk.description != "joined"){
                        // console.log(`clientttk id = ${clientttk.id}`)
                        console.log(`clientttk name = ${clientttk.name}`)
                        console.log(`clientttk description = ${clientttk.description}`)
                        // console.log(`clientttk isComplete = ${clientttk.isComplete}`)
                        // console.log(`clientttk sessionttkId = ${clientttk.sessionttkId}`)
                    }
                  })
                })
                resolve('success')
              })
          })
      })
}
function initDB() {  
    
    let sessionttkId

    sessionTTKRepo.createTable()
    .then(() => clientTTKRepo.createTable())
    .then(() => sessionTTKRepo.create("hehe"))
    .then((data) => {
        sessionttkId = data.id
      const clientttks = [
        {
          name: 'Outline',
          description: 'High level overview of sections',
          isComplete: 1,
          sessionttkId
        },
        {
          name: 'Write',
          description: 'Write article contents and code examples',
          isComplete: 0,
          sessionttkId
        }
      ]
      return Promise.all(clientttks.map((clientttk) => {
        const { name, description, isComplete, sessionttkId } = clientttk
        return clientTTKRepo.create(name, description, isComplete, sessionttkId)
      }))
    })
    .then(() => sessionTTKRepo.getById(sessionttkId))
    .then((sessionttk) => {
      console.log(`\nRetreived sessionttk from database`)
      console.log(`sessionttk id = ${sessionttk.id}`)
      console.log(`sessionttk name = ${sessionttk.name}`)
      console.log(`sessionttk datetime_start = ${sessionttk.datetime_start}`)
      console.log(`sessionttk datetime_end = ${sessionttk.datetime_end}`)
      return sessionTTKRepo.getClientInSession(sessionttk.id)
    })
    .then((clientttks) => {
      console.log('\nRetrieved sessionttk clientttk from database')
      return new Promise((resolve, reject) => {
        clientttks.forEach((clientttk) => {
          console.log(`clientttk id = ${clientttk.id}`)
          console.log(`clientttk name = ${clientttk.name}`)
          console.log(`clientttk description = ${clientttk.description}`)
          console.log(`clientttk isComplete = ${clientttk.isComplete}`)
          console.log(`clientttk sessionttkId = ${clientttk.sessionttkId}`)
        })
      })
      resolve('success')
    })
    .catch((err) => {
      console.log('Error: ')
      console.log(JSON.stringify(err))
    })
  }
// Serve frontend files
app.use(express.static('public'));

// Start http listener
const host = "0.0.0.0";
const port = process.env.PORT || 8081;
httpServer.listen(port,host);
console.info(`Server running! Please visit http://${host}:${port}`);