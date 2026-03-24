import contractRegistry from './contract';
import supplierRegistry from './supplier';
import contactRegistry from './contact';
import authRegistry from './auth';
import documentRegistry from './document';
import divRegistry from './div';

export default contactRegistry.definitions
  .concat(supplierRegistry.definitions)
  .concat(contractRegistry.definitions)
  .concat(authRegistry.definitions)
  .concat(documentRegistry.definitions)
  .concat(divRegistry.definitions);
