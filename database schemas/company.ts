import { ObjectId } from 'bson';
import { InferSchemaType, Schema, model } from 'mongoose';
import { States, StatusType } from '../util/types';

export interface IBaseOrganization {
  name: string;
  status?: StatusType;
  taxIdNumber?: string;
  email?: string;
  phone?: string;
  phoneCountryCode?: string;
  webpage?: string;
  address?: string;
  postCode?: string;
  city?: string;
  country?: string;
  industry?: string;
}

interface ICompany extends IBaseOrganization {
  size?: number;
  locations?: ObjectId[];
}

const companySchema = new Schema<ICompany>(
  {
    name: { type: String, required: true },
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
    size: { type: Number, required: false },
    industry: { type: String, required: false },
    locations: [{ type: Schema.Types.ObjectId, required: true }]
  },
  { timestamps: true }
);

export const Company = model<ICompany>('Company', companySchema);
export type Company = InferSchemaType<typeof companySchema>;
