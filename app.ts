import * as dotenv from 'dotenv';
import bodyParser from 'body-parser';
import connectMongo from 'connect-mongo';
import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import morgan from 'morgan';
import passport from 'passport';
import session from 'express-session';
import {
  VAR_APPLICATION_VERSION,
  VAR_MAX_REQ_SIZE_MB,
  VAR_MONGODB_URL,
  VAR_PORT,
  VAR_SESSION_MAX_MINUTES
} from './util/variables';
import { initApplication } from './util/helpers';
import { CORSConfiguration } from './util/request';
import routes from './routes/';

dotenv.config();

import './services/passport/passport';

const app = express();

app.use(bodyParser.json({ limit: `${VAR_MAX_REQ_SIZE_MB}MB` }));
app.use(morgan(':date[iso] :method :url :status - :response-time ms'));
app.set('trust proxy', 1);
app.use(
  session({
    secret: 'supercalifragilisticexpialidocious',
    resave: true, // Keeping the session alive
    saveUninitialized: false, // Only storing modified and active sessions
    rolling: true,
    store: connectMongo.create({ mongoUrl: VAR_MONGODB_URL }),
    cookie: {
      maxAge: VAR_SESSION_MAX_MINUTES * 60 * 1000
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(cors(CORSConfiguration));
app.use('/', routes);

if (typeof VAR_MONGODB_URL === 'string') {
  mongoose
    .connect(VAR_MONGODB_URL)
    .then(result => {
      for (const connection in result.connections) {
        console.log(
          `Database ${result.connections[connection].name} is running on ${result.connections[connection].host}:${result.connections[connection].port}`
        );
      }
      initApplication();
      app.listen(VAR_PORT, () => {
        console.log(`Application running v${VAR_APPLICATION_VERSION} on port ${VAR_PORT}`);
      });
    })
    .catch(error => {
      // handle error
      console.log(error);
      app.listen(VAR_PORT, () => {
        console.log(
          `Application running v${VAR_APPLICATION_VERSION} on port ${VAR_PORT}, but with no database connected.`
        );
      });
    });
}
