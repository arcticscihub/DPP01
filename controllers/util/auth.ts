import { ObjectId } from 'bson';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';

import { User } from '../../models';
import { AccessRoles } from '../../util/types';
import { log } from 'console';

const checkInitials = ({
  accessLevel,
  company,
  id
}: {
  accessLevel?: { actingUserRole: number; threshold: number };
  company?: { actingUser: User; targetUserCompany: ObjectId };
  id?: string | ObjectId;
}) => {
  let success: boolean = false;

  if (accessLevel) {
    if (accessLevel.actingUserRole < accessLevel.threshold) {
      return {
        success,
        message: 'User access role not high enough'
      };
    }
  }

  if (company) {
    if (
      company.actingUser.role < AccessRoles.ADMIN &&
      !(company.actingUser.company as ObjectId).equals(company.targetUserCompany)
    ) {
      return {
        success,
        message: 'User can not perform changes in another company'
      };
    }
  }

  if (id) {
    if (!(typeof id && mongoose.Types.ObjectId.isValid(id))) {
      return {
        success,
        message: 'ID is invalid'
      };
    }
  }

  return { success: true, message: 'Verification succeeded' };
};

const randomPassword = (length: number) => {
  const bytes = randomBytes(length / 2);
  return bytes.toString('hex');
};

export default { checkInitials, randomPassword };
