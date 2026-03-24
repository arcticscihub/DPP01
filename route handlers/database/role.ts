import { Role } from '../../models/';
import { Logger } from '../../util/logging';

const logger = new Logger('Role');

const getRoles = async (query: object = {}) => {
  try {
    return await Role.find(query);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

export default { getRoles };
