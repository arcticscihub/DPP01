import { capitalizeFirstString } from '../../util/helpers';
import { ZContact } from '../../validators/';

export const capitalizeLetters = (reqBody: ZContact) => {
  reqBody.firstName && (reqBody.firstName = capitalizeFirstString(reqBody.firstName));

  return reqBody;
};
