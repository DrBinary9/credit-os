const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
  DeleteCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);

async function scanTable(tableName) {
  const items = [];
  let lastKey = undefined;
  do {
    const cmd = new ScanCommand({
      TableName: tableName,
      ExclusiveStartKey: lastKey,
    });
    const res = await docClient.send(cmd);
    items.push(...(res.Items || []));
    lastKey = res.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function getItem(tableName, key) {
  const cmd = new GetCommand({ TableName: tableName, Key: key });
  const res = await docClient.send(cmd);
  return res.Item;
}

async function putItem(tableName, item) {
  const cmd = new PutCommand({ TableName: tableName, Item: item });
  return docClient.send(cmd);
}

async function deleteItem(tableName, key) {
  const cmd = new DeleteCommand({ TableName: tableName, Key: key });
  return docClient.send(cmd);
}

module.exports = { scanTable, getItem, putItem, deleteItem };
