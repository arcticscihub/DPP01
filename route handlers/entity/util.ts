import { capitalizeFirstString } from '../../util/helpers';
import { ZSupplier } from '../../validators/';

export const capitalizeLetters = (reqBody: ZSupplier) => {
  reqBody.name && (reqBody.name = capitalizeFirstString(reqBody.name));
  reqBody.address && (reqBody.address = capitalizeFirstString(reqBody.address));
  reqBody.city && (reqBody.city = capitalizeFirstString(reqBody.city));
  reqBody.description && (reqBody.description = capitalizeFirstString(reqBody.description));

  return reqBody;
};
