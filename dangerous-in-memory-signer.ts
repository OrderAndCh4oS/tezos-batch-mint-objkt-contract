// @ts-ignore
import { InMemorySigner } from '@taquito/signer';
import {config} from "dotenv";

config()

if(!process.env.WALLET_PRIVATE_KEY) throw new Error('Missing private key');

const signer = await InMemorySigner.fromSecretKey(process.env.WALLET_PRIVATE_KEY, process.env.WALLET_PASSPHRASE);

export default signer;
