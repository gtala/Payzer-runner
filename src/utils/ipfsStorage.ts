import { Web3Storage } from 'web3.storage';
import 'dotenv/config';
import axios from 'axios';

export const storeIpfsData = async (data: Object): Promise<string> => {
  const client = makeStorageClient();
  const files = makeFileObjects(data);
  const cid = await client.put(files);
  console.log('Content added with CID:', cid);
  return cid;
};

const makeStorageClient = (): Web3Storage => {
  const token = process.env.WEB3_STORAGE || '';
  return new Web3Storage({ token: token });
};

export const getResource = async (resource: string) => {
  const client = makeStorageClient();
  const data = [];

  for await (const upload of client.list()) {
    const url = `https://ipfs.io/ipfs/${upload.cid}/${resource}.json`;
    try {
      const response = await axios.get(url, {});
      data.push(response.data);
    } catch (e) {}
  }

  return data;
};

export const makeFileObjects = (obj: Object) => {
  const buffer = Buffer.from(JSON.stringify(obj));
  const files = [
    new File(['contents-of-file-1'], 'plain-utf8.txt'),
    new File([buffer], 'users.json'),
  ];
  return files;
};