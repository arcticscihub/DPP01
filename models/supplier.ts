import { ObjectId } from 'bson';
import { InferSchemaType, Schema, model } from 'mongoose';

import { IBaseOrganization } from './company';

import { States, StatusType } from '../util/types';

interface ISupplier extends Partial<IBaseOrganization> {
  name?: string;
  company?: ObjectId;
  description?: string;
  contact: ObjectId[];
}

const supplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: false },
    company: { type: Schema.Types.ObjectId, required: false, ref: 'Company' },
    status: { type: String, required: false, default: 'active', enum: States },
    taxIdNumber: { type: String, required: false },
    email: { type: String, required: false, lowercase: true },
    phone: { type: String, required: false },
    phoneCountryCode: { type: String, required: false },
    webpage: { type: String, required: false },
    address: { type: String, required: false },
    postCode: { type: String, required: false },
    city: { type: String, required: false },
    country: { type: String, required: false },
    description: { type: String, required: false },
    contact: [{ type: Schema.Types.ObjectId, required: false, ref: 'Contact' }],
    industry: { type: String, required: false }
  },
  { timestamps: true }
);

export const Supplier = model<ISupplier>('Supplier', supplierSchema);
export type Supplier = InferSchemaType<typeof supplierSchema>;
