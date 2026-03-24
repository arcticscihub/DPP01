import { ObjectId } from 'bson';
import { InferSchemaType, Schema, model } from 'mongoose';

import { States, StatusType } from '../util/types';

interface IContact {
  firstName?: string;
  lastName?: string;
  status?: StatusType;
  company?: ObjectId;
  email?: string;
  phone?: number;
  phoneCountryCode?: string;
}

const contactSchema = new Schema<IContact>(
  {
    firstName: { type: String, required: false },
    lastName: { type: String, required: false },
    status: { type: String, required: false, default: 'active', enum: States },
    company: { type: Schema.Types.ObjectId, required: false, ref: 'Company' },
    email: { type: String, required: false, lowercase: true },
    phone: { type: Number, required: false },
    phoneCountryCode: { type: String, required: false }
  },
  { timestamps: true }
);

export const Contact = model<IContact>('Contact', contactSchema);
export type Contact = InferSchemaType<typeof contactSchema>;
