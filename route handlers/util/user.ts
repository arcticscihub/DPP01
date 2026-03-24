import { ObjectId } from 'bson';

import db from '../db';

import { User } from '../../models/';
import { AccessRoles, States, WithID } from '../../util/types';

export const lastOfRole = async (user: WithID<User>) => {
  switch (user.role) {
    case AccessRoles.ADMIN:
      if (user.status !== States.ACTIVE || !user.isVerified) {
        return false;
      }
      const administrators = await db.user.getMany(
        { role: AccessRoles.ADMIN, status: States.ACTIVE, isVerified: true },
        { role: 1, firstName: 1, lastName: 1 }
      );
      if (administrators && administrators.length < 2) {
        return true;
      }
      return false;
    case AccessRoles.OWNER:
      if (user.status !== States.ACTIVE || !user.isVerified) {
        return false;
      }
      const owners = await db.user.getMany(
        {
          company: user.company,
          role: AccessRoles.OWNER,
          status: States.ACTIVE,
          isVerified: true
        },
        { role: 1, firstName: 1, lastName: 1 }
      );
      if (owners && owners.length < 2) {
        return true;
      }
      return false;
    default:
      return false;
  }
};

export default { lastOfRole };
