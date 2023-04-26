import fs from "fs/promises";
import sharp from "sharp";
import {create} from "ipfs-http-client";
import {OpKind, TezosToolkit} from "@taquito/taquito";
import signer from "./dangerous-in-memory-signer.ts";
import {char2Bytes} from "@taquito/utils";

export interface Tzip {
    date: string
    image: string
    symbol: string
    formats: TzipFormat[]
    creators: string[]
    description: string
    tags: string[]
    minter: string
    royalties: TzipRoyalties
    decimals: number
    displayUri: string
    rights: string
    name: string
    attributes: TzipAttributes[]
    thumbnailUri: string
    artifactUri: string
    mintingTool: string
}

export interface TzipFormat {
    fileName?: string
    fileSize?: number
    mimeType: string
    uri: string
    dimensions?: TzipFormatDimensions
}

export interface TzipFormatDimensions {
    unit: string;
    value: string
}

export interface TzipRoyalties {
    shares: Record<string, number>;
    decimals: number
}

export interface TzipAttributes {
    name: string
    value: string
}

export interface MetadataPayload {
    name: string
    artifactUri: string
    displayUri: string
    thumbnailUri: string
    creators: string[]
    description: string,
    tags: string[],
    attributes: TzipAttributes[],
    formats: TzipFormat[],
    royalties: TzipRoyalties
}

export interface TokenData {
    image: string,
    name: string,
    description: string,
    tags: string[],
    attributes: TzipAttributes[],
    creators: string[],
    royalties: TzipRoyalties
}

const makeMetadata = (
    {
        name,
        artifactUri,
        displayUri,
        thumbnailUri,
        formats,
        creators,
        description,
        tags,
        attributes,
        royalties
    }: MetadataPayload
): Tzip => ({
    artifactUri,
    displayUri,
    thumbnailUri,
    image: displayUri,
    creators,
    date: (new Date()).toISOString(),
    decimals: 0,
    description,
    formats,
    minter: "KT1Aq4wWmVanpQhq4TTfjZXB5AjFpx15iQMM",
    mintingTool: "orderandchaos_batch_script_v1",
    name,
    rights: "No License / All Rights Reserved",
    royalties,
    symbol: 'OBJKTCOM',
    tags,
    attributes
});

async function loadFile(path: string) {
    try {
        return await fs.readFile(path);
    } catch (err) {
        console.log('Failed to load file', err);
        return null
    }
}

function resizeImage(file: Buffer, width: number) {
    return sharp(file)
        .resize({
            fit: sharp.fit.contain,
            width
        })
}

const auth = Buffer.from(`${process.env.INFURA_API_KEY}:${process.env.INFURA_API_KEY_SECRET}`).toString('base64')
const ipfsUrl = 'https://ipfs.infura.io:5001';
const ipfs = create({
    url: ipfsUrl,
    headers: {
        Authorization: `Basic ${auth}`
    }
});

const addToIpfs = async (file: Buffer) => {
    const hash = await ipfs.add(file);
    return `ipfs://${hash.path}`;
};

async function makeFormat(fileName: string, uri: string, metadata: sharp.Metadata | sharp.OutputInfo): Promise<TzipFormat> {
    return {
        dimensions: {value: `${metadata.width}x${metadata.height}`, unit: 'px'},
        fileName,
        uri,
        fileSize: metadata.size,
        mimeType: `image/${metadata.format}`
    };
}

const makeToken = async ({image, name, description, tags, attributes, creators, royalties}: TokenData) => {
    const file = await loadFile(`./files/${image}`);
    if (!file) throw new Error(`File not loaded: ${image}`);
    const imageSharp = await sharp(file)
    const imageMetadata = await imageSharp.metadata()
    const displayImageSharp = resizeImage(file, 1024);
    const displayImageMetadata = (await displayImageSharp.toBuffer({resolveWithObject: true})).info
    const thumbnailImageSharp = resizeImage(file, 350);
    const thumbnailImageMetadata = (await thumbnailImageSharp.toBuffer({resolveWithObject: true})).info

    const artifactUri = await addToIpfs(file);
    const displayUri = await addToIpfs(await displayImageSharp.toBuffer());
    const thumbnailUri = await addToIpfs(await thumbnailImageSharp.toBuffer());

    const metadata = makeMetadata({
        name,
        description,
        artifactUri,
        displayUri,
        thumbnailUri,
        creators,
        royalties,
        attributes,
        tags,
        formats: [
            await makeFormat(image, artifactUri, imageMetadata),
            await makeFormat('cover-' + image, displayUri, displayImageMetadata),
            await makeFormat('thumbnail-' + image, thumbnailUri, thumbnailImageMetadata),
        ]
    });
    return addToIpfs(Buffer.from(JSON.stringify(metadata)));
};

export default async function mintTokens(tokenId: number, tokenQty: number, creators: string[], tokens: TokenData[]) {
    const metadataHashes = [];

    for (const token of tokens) {
        metadataHashes.push(await makeToken(token));
    }

    console.log('Metadata:\n', metadataHashes);

    const Tezos = new TezosToolkit('https://mainnet.tezos.marigold.dev/');
    Tezos.setProvider({signer});

    const minterContractAddress: string = 'KT1Aq4wWmVanpQhq4TTfjZXB5AjFpx15iQMM';
    const minter = await Tezos.wallet.at(minterContractAddress)

    await Tezos.wallet.batch(
        metadataHashes.map(metadataHash => ({
            kind: OpKind.TRANSACTION,
            ...minter.methods
                .mint_artist(
                    tokenId,
                    tokenQty,
                    char2Bytes(metadataHash),
                    creators[0] // Note: This assumes the first address in creators is the signed wallet.
                )
                .toTransferParams({storageLimit: 350}),
        }))).send()

    console.log('~~Fin~~');
}
