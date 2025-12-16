import mongoose from 'mongoose';

import auth from './auth';
import contract from './contract';
import supplier from './supplier';
import user from './user';

import { Asset, Consumption, Contract, Location, Operation, Supplier, User } from '../../models/';

export const createUpdateObject = (
  excistingObject: Asset | Consumption | Contract | Location | Operation | Supplier | User,
  updatedObject: Asset | Consumption | Contract | Location | Operation | Supplier | User
) => {
  const missingAttributes: any = {};

  for (const attribute in excistingObject) {
    if (
      ['_id', '__v', 'createdAt', 'updatedAt'].includes(attribute) ||
      attribute in updatedObject
    ) {
      continue;
    }
    missingAttributes[attribute] = 1;
  }

  return missingAttributes;
};

export const combineAndSortArrays = (arrays: string[][]) => {
  const combined = arrays.reduce((a, c) => a.concat(c), []);
  return removeDuplicates(combined);
};

export const removeDuplicates = (array: string[]) => {
  return [...new Set(array)].sort();
};

export const splitValueByMonth = ({
  from,
  to,
  value
}: {
  from: Date;
  to: Date;
  value: number;
}) => {
  const totalDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const valuePerDay = value / totalDays;
  const result = [];
  let month = from.getMonth();
  let year = to.getFullYear();
  let date = from;

  while (date <= to) {
    const lastOfMonth = new Date(year, month + 1, 0);
    const monthDays = lastOfMonth.getDate();
    const daysInDateRange = Math.min(
      monthDays - date.getDate() + 1,
      Math.ceil((to.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );

    const monthlyValue = valuePerDay * daysInDateRange;

    result.push({
      date: `${year}-${month + 1 < 10 ? '0' + (month + 1) : month + 1}-${
        date.getDate() < 10 ? '0' + date.getDate() : date.getDate()
      }T00:00:00.000Z`,
      value: monthlyValue
    });

    date.setMonth(date.getMonth() + 1);
    date.setDate(1);
    if (date.getMonth() === 0) {
      year++;
    }
    month = date.getMonth();
  }
  return result;
};

export default {
  auth,
  contract,
  supplier,
  ...user,
  createUpdateObject,
  combineAndSortArrays,
  splitValueByMonth,
  removeDuplicates
};

export * from './user';
