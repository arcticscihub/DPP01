import bcrypt from 'bcryptjs';
import { promises } from 'fs';
import mongoose from 'mongoose';

import { initAutomatedTasks } from './cron';

import { Logger } from './logging';
import { AccessRoles } from './types';
import { VAR_ADMIN_PASSWORD, VAR_ADMIN_EMAIL } from './variables';

import { Circularity, Contract, Role, User } from '../models/';

const logger = new Logger('Utility');

let roles: Role[] = [];

export const capitalizeFirstString = (value: string, lowerCaseRest?: boolean) => {
  let rest = value.slice(1);
  if (lowerCaseRest) {
    rest = rest.toLowerCase();
  }
  return value ? value[0].toUpperCase() + rest : '';
};

export const capitalizeFirstObject = <T>(obj: T) => {
  let object: Record<string, string> = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      object[key] = capitalizeFirstString(String(obj[key]));
    }
  }
  return object;
};

export const capitalizeFirstArray = (array: string[]): string[] => {
  const capitalizedArray: string[] = [];
  if (array.length > 0) {
    array.forEach(element => {
      if (typeof element === 'string') {
        capitalizedArray.push(capitalizeFirstString(element));
      }
    });
  }
  return capitalizedArray;
};

const getProperty = async (property: string) => {
  try {
    const result = await promises.readFile(`${__dirname}/../properties.json`, 'utf8');
    const properties = JSON.parse(result);
    if (property in properties) {
      return properties[property];
    } else {
      return null;
    }
  } catch (error: any) {
    logger.errorMessage(error?.message);
  }
};

const initCircularity = async () => {
  const excistingMetrics = await Circularity.find();
  const newMetrics = await getProperty('circularity');

  if (
    JSON.stringify(excistingMetrics.map(item => item.value)) ===
    JSON.stringify(newMetrics.map((item: Circularity) => item.value))
  ) {
    logger.debugMessage('Circularity metrics - No changes done, no update initiated');
  } else {
    logger.debugMessage('Circularity metrics - Updating database');
    await Circularity.deleteMany({});
    await Circularity.insertMany(newMetrics);

    const removedValues = excistingMetrics
      .map(item => item.value)
      .filter(item => !newMetrics.map((item: Circularity) => item.value).includes(item));

    if (removedValues.length > 0) {
      logger.debugMessage('Circularity metrics - Removing old values');
      await Contract.updateMany(
        {
          circularity: {
            $in: removedValues
          }
        },
        {
          $pull: {
            circularity: {
              $in: removedValues
            }
          }
        }
      );
    }
  }
};

const initUserAccessRoles = async () => {
  const result = await Role.find();
  if (result.length === 0) {
    logger.debugMessage(
      'User access roles - No values in database, initializing user access roles'
    );
    const rolesProps = await getProperty('roles');
    const result = await Role.insertMany(
      rolesProps.map((role: { _id: number; label: string; value: number }) => {
        return { ...role, _id: new mongoose.Types.ObjectId(role._id) };
      })
    );
    if (result && result.length > 0) {
      for (const obj in result) {
        const r = result[obj] as Role;
        roles.push(r);
      }
    } else {
      const result = await Role.find();
      roles = result;
    }
    logger.debugMessage('User access roles - Initialized base values');
  } else {
    logger.debugMessage('User access roles - Found values in database');
    roles = result;
    logger.debugMessage('User access roles - Initialized with values from database');
  }
};

const initAdministrator = async () => {
  if (!(VAR_ADMIN_PASSWORD && VAR_ADMIN_EMAIL)) {
    return;
  }

  const excists = await User.findOne({ email: VAR_ADMIN_EMAIL });
  if (!excists) {
    const hashedPassword = await bcrypt.hash(VAR_ADMIN_PASSWORD, 10);
    try {
      const user = new User({
        firstName: 'Application',
        lastName: 'Administrator',
        email: VAR_ADMIN_EMAIL,
        isVerified: true,
        role: AccessRoles.ADMIN,
        onboarding: { state: 'Form' },
        jobTitle: 'Administrator',
        password: hashedPassword
      });
      user.save();
    } catch (error: any) {
      logger.errorMessage(error?.message);
      return null;
    }
  }
};

export const initApplication = async () => {
  await initAutomatedTasks();
  await initCircularity();
  await initUserAccessRoles();
  await initAdministrator();
};

export default { capitalizeFirstArray, capitalizeFirstString, initApplication };
