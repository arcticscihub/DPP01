import { Company } from '../../models/';
import { Logger } from '../../util/logging';

const logger = new Logger('Company');

const addCompany = async (c: Company) => {
  try {
    const company = new Company(c);
    return await company.save();
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getCompany = async (query: object, fields?: object) => {
  try {
    return await Company.findOne(query, fields);
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

const getCompanies = async () => {
  try {
    return await Company.find();
  } catch (error: any) {
    logger.errorMessage(error?.message);
    return null;
  }
};

export default { addCompany, getCompanies, getCompany };
