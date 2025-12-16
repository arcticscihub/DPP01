import { ObjectId } from 'bson';

import { capitalizeLetters as CapitalizeContactLetters } from '../contact/util';
import db from '../db';

import { ZContact } from '../../validators/';

export const handleContactPersons = async (contacts: ZContact[], company?: ObjectId) => {
  let newContacts: ObjectId[] = [];

  for (const contact in contacts) {
    const validated = ZContact.safeParse({
      ...contacts[contact],
      phone:
        typeof contacts[contact].phone === 'string'
          ? Number(contacts[contact].phone)
          : contacts[contact].phone
    });
    if (validated.success) {
      const parsed = CapitalizeContactLetters(validated.data);
      const result = await db.contact.addContact({
        ...parsed,
        company: company
      });
      newContacts.push(result._id);
    }
  }

  return newContacts;
};

export default { handleContactPersons };
