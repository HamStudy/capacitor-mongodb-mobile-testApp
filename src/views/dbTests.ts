import { Plugins } from '@capacitor/core';
import { MongoDBMobileSource, setMongoMobilePlugin, Db, Types } from '@hamstudy/mongodb-mobile-client';

const MongoDBMobile = Plugins.MongoDBMobile as MongoDBMobileSource;
setMongoMobilePlugin(MongoDBMobile);

export type testRunner = (name: string, test: () => Promise<string | boolean>) => Promise<void>;

const sampleDoc1 = {
  someId: 1,
  title: "Huck Finn: Adventures in coding",
  author: "Ray Bateman",
  rating: -5,
  worthReading: false,
  publicationDate: new Date('2018-01-01T05:00:00Z'),
};
const sampleDoc2 = {
  someId: 2,
  title: "Unit tests: Just say no.",
  author: "Ben Loveridge",
  rating: 5,
  worthReading: true,
  publicationDate: new Date('2018-02-01T05:00:00Z'),
};
const sampleDoc3 = {
  someId: 3,
  title: "How to start so many projects you'll never ever finish them",
  author: "Richard Bateman",
  rating: 3,
  worthReading: "maybe",
  publicationDate: new Date('2018-01-05T05:00:00Z'),
};
interface ExtJsonOid {
  $oid: string;
}

function equals(a: any, b: any) {
  if (a instanceof Date) {
    if (! (b instanceof Date)) {
      return false;
    }
    a = a.getTime();
    b = b.getTime();
  }
  return a === b;
}

function assertKeyEquals<T extends object>(doc: T, field: keyof T, value: any) {
  if (!doc) {
    throw new Error('Variable containing field to assert was not an object!');
  }
  if (!equals(doc[field], value)) {
    throw new Error(`Expected ${field} to equal ${value} but got ${JSON.stringify(doc[field])}`);
  }
}

function assertKeyTruthy<T extends object>(doc: T, field: keyof T) {
  if (!doc) {
    throw new Error('Variable containing field to assert true was not an object!');
  }
  if (!doc[field]) {
    throw new Error(`Expected ${field} to be truthy but it is ${JSON.stringify(doc[field])}`);
  }
}

function assertEquals<T>(a: T, b: T, fieldName: string = "field") {
  if (!equals(a, b)) {
    throw new Error(`Expected ${fieldName} to be ${b} but got ${JSON.stringify(a)}`);
  }
}

function assertIsType(v: any, t: string, fieldName: string = "field") {
  if (typeof v != t) {
    throw new Error(`Expected ${fieldName} to be type ${t} but got ${typeof v}`);
  }
}

function assertIsInstance<T extends Function>(v: any, t: T, fieldName: string = "field") {
  if (!(v instanceof t)) {
    throw new Error(`Expected ${fieldName} to be instance of ${t} but got ${typeof v}`);
  }
}

export async function executeTests(runTest: testRunner) {
  // Tests:
  let db = new Db('testDb');
  let booksCollection = db.collection('books');

  await runTest('Initialize the database connection', async () => {
    await MongoDBMobile.initDb();
    return true;
  });
  await runTest('Drop the test database (if it exists)', async () => {
    let result = await db.dropDatabase();
    console.log("Drop database result:", result);
    return true;
  });
  await runTest('Creating an index', async () => {
    let result = await booksCollection.createIndex({
      someId: 1, worthReading: 1
    });

    console.log("Created index: ", result);
    return true;
  });
  await runTest('Count documents (should be zero)', async () => {
    let result = await booksCollection.count();
    assertIsType(result, 'number', 'result');
    if (result > 0) {
      throw new Error(`expected 0, got ${result}`);
    }
    return true;
  });
  await runTest('Insert new document', async () => {
    let result = await booksCollection.insertOne(sampleDoc1);
    if (!result.insertedCount) {
      throw new Error("falsy insertedCount");
    }
    return true;
  });
  await runTest('Count documents again (should be one)', async () => {
    let result = await booksCollection.count();
    if (result !== 1) {
      throw new Error(`Expected 1, got ${result}`);
    }
    return true;
  });
  await runTest('Search for the document by someId and check values', async () => {
    let doc = await booksCollection.findOne<typeof sampleDoc1 & {_id: Types.ObjectId}>({someId: 1});
    if (!doc) {
      throw new Error("Document not found!");
    }
    assertKeyTruthy(doc, "_id");
    assertEquals(doc._id instanceof Types.ObjectId, true, "_id is ObjectId");

    assertKeyEquals(doc, "author", sampleDoc1.author);
    assertKeyEquals(doc, "rating", sampleDoc1.rating);
    assertKeyEquals(doc, "title", sampleDoc1.title);
    assertKeyEquals(doc, "worthReading", sampleDoc1.worthReading);
    assertIsInstance(doc.publicationDate, Date);
    assertKeyEquals(doc, "publicationDate", sampleDoc1.publicationDate);
    assertKeyEquals(doc, "someId", 1);

    return true;
  });
  await runTest('Delete all the documents from the collection', async () => {
    let res = await booksCollection.deleteMany<typeof sampleDoc1>({});

    assertKeyEquals(res, "deletedCount", 1);
    return true;
  });
  await runTest('Add several documents at once with insertMany', async () => {
    let docsToInsert = [sampleDoc1, sampleDoc2, sampleDoc3];
    let insertResult = await booksCollection.insertMany(docsToInsert, {ordered: false});
    
    assertKeyEquals(insertResult, "insertedCount", 3);

    return true;
  });
  await runTest('Test searching with a regex, just for kicks', async () => {
    let count = await booksCollection.count<typeof sampleDoc1>({author: {$regex: 'Bateman$', $options: ''}});

    if (count != 2) {
      throw new Error(`Expected count to be 2, got ${count}`);
    }
    return true;
  });
  await runTest('Test iterating over cursor', async () => {
    let cursor = booksCollection.find<typeof sampleDoc1>({});

    let c = 0;
    let n: typeof sampleDoc1 | null; 
    while (n = await cursor.next()) {
      ++c;
      assertEquals(typeof n.rating, "number", "rating field type");
      if (typeof n.rating != "number") {
        throw new Error(`Type mismatch on rating field! Got ${typeof n.rating}`);
      }
    }

    assertEquals(c, 3, "document count");
    return true;
  });
  await runTest('Simple aggregation', async () => {
    let cursor = booksCollection.aggregate([
      {$match: {someId: {$gte: 0}}},
      {$sort: {someId: 1}},
      {$group: {
        _id: "something",
        titles: {$push: "$title"},
        authors: {$last: "$author"},
        ratingSum: {$sum: "$rating"},
      }}
    ]);

    let results = await cursor.toArray();
    assertEquals(results.length, 1, "aggregate results");
    assertEquals(results[0]._id, "something", "aggregate result _id");
    assertEquals(results[0].titles.length, 3, "aggregate title count");
    assertEquals(results[0].authors, "Richard Bateman", "aggregate author");
    assertEquals(results[0].ratingSum, 3, "aggregate result _id");

    return true;
  });
}