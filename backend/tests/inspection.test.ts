import { test, describe, before, after, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { Inspection } from '../src/models/Inspection';
import { User, UserRole } from '../src/models/User';
import { Product } from '../src/models/Product';
import { createInspection, getInspections, getInspectionById } from '../src/controllers/inspectionController';
import dotenv from 'dotenv';
dotenv.config();

// Mock request and response
const mockResponse = () => {
  const res: any = {};
  res.status = (code: number) => res;
  res.json = (data: any) => {
    res.data = data;
    return res;
  };
  return res;
};

// Instead of Jest mocks, we just test the DB logic and mock aiService if needed
// Actually, we can test just the DB interactions by bypassing createInspection or mocking dependencies.
// Let's just create raw db entries to test `getInspections` and `getInspectionById`.
// For `createInspection`, it might be easier to just verify the logic locally since we can't easily mock `aiService` globally in `node:test` without `proxyquire` or similar.

describe('Inspection Relationships', () => {
  before(async () => {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sih-test-db');
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await Inspection.deleteMany({});
    await User.deleteMany({});
    await Product.deleteMany({});
  });

  it('inspection list returns inspector information and product information', async () => {
    const user = await User.create({ email: 'list@example.com', password: 'pwd', role: UserRole.INSPECTOR, name: 'List Inspector' });
    const product = await Product.create({ name: 'Test Product', brand: 'Brand', category: 'Food', manufacturer: 'Mfg' });
    
    await Inspection.create({
      inspectionId: 'INSP-123',
      inspectorId: user._id,
      productId: product._id,
      status: 'PENDING',
      images: [],
      extractedDeclarations: {},
      findings: []
    });

    const req = {} as any;
    const res = mockResponse();

    await getInspections(req, res);
    
    const returnedData = res.data;
    assert.equal(returnedData.length, 1);
    assert.equal(returnedData[0].inspectorId.name, 'List Inspector');
    assert.equal(returnedData[0].productId.name, 'Test Product');
  });

  it('historical inspection with missing inspectorId does not crash', async () => {
    await Inspection.create({
      inspectionId: 'INSP-456',
      status: 'PENDING',
      images: [],
      extractedDeclarations: {},
      findings: []
    });

    const req = {} as any;
    const res = mockResponse();

    await getInspections(req, res);
    
    const returnedData = res.data;
    assert.equal(returnedData.length, 1);
    assert.equal(returnedData[0].inspectorId, undefined); // Should not crash
  });

  it('individual inspection returns inspector information', async () => {
    const user = await User.create({ email: 'list2@example.com', password: 'pwd', role: UserRole.INSPECTOR, name: 'List Inspector 2' });
    
    const inspection = await Inspection.create({
      inspectionId: 'INSP-789',
      inspectorId: user._id,
      status: 'PENDING',
      images: [],
      extractedDeclarations: {},
      findings: []
    });

    const req = { params: { id: inspection._id.toString() } } as any;
    const res = mockResponse();

    await getInspectionById(req, res);
    
    const returnedData = res.data;
    assert.equal(returnedData.inspectorId.name, 'List Inspector 2');
  });
});
