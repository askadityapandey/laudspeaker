import { CustomerDocument } from '../schemas/customer.schema';

export interface CustomerSearchOptionResult {
  customer: CustomerDocument,
  findType: number;
}