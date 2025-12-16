import bcrypt from 'bcryptjs';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Company, User } from '../../models/';
import { States } from '../../util/types';

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    let user = await User.findOne({ email: username });

    if (!user) {
      return done(null, false, { message: 'WRONG_CREDENTIALS_ERROR' });
    }

    let result = false;
    typeof user.password === 'string' && (result = await bcrypt.compare(password, user.password));

    if (!result || user.status !== States.ACTIVE) {
      return done(null, false, { message: 'WRONG_CREDENTIALS_ERROR' });
    }

    const companyUnavailable = await Company.findOne({
      _id: user.company,
      status: { $nin: [States.ACTIVE] }
    });

    if (companyUnavailable) {
      return done(null, false, { message: 'COMPANY_DISABLED_ERROR' });
    }

    user.password = undefined;
    user['id'] = user._id;
    return done(null, user);
  })
);
