import { capitalizeFirstArray, capitalizeFirstString } from '../../util/helpers';
import { ZContract } from '../../validators/';

export const capitalizeLetters = (reqBody: ZContract) => {
  reqBody.name && (reqBody.name = capitalizeFirstString(reqBody.name));
  reqBody.description && (reqBody.description = capitalizeFirstString(reqBody.description));

  reqBody.department && (reqBody.department = capitalizeFirstArray(reqBody.department));
  reqBody.bonuses && (reqBody.bonuses = capitalizeFirstArray(reqBody.bonuses));

  if (reqBody.scope) {
    reqBody.scope.mainCategory &&
      (reqBody.scope.mainCategory = capitalizeFirstArray(reqBody.scope.mainCategory));
    reqBody.scope.subCategory &&
      (reqBody.scope.subCategory = capitalizeFirstArray(reqBody.scope.subCategory));
    reqBody.scope.product && (reqBody.scope.product = capitalizeFirstArray(reqBody.scope.product));
  }

  reqBody.additionalInformation &&
    reqBody.additionalInformation.forEach(obj => {
      obj.title && (obj.title = capitalizeFirstString(obj.title));
      obj.text && (obj.text = capitalizeFirstString(obj.text));
    });

  return reqBody;
};
